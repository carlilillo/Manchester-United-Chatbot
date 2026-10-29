import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessage, StreamEvent } from '@united/contracts';
import { useConversation } from '../src/features/chat/hooks/use-conversation';

const mock = vi.hoisted(() => ({
  messages: vi.fn(),
  createChat: vi.fn(),
  stream: vi.fn(),
  edit: vi.fn(),
  allChats: vi.fn(),
  feedback: vi.fn(),
}));
vi.mock('../src/lib/api', () => ({ api: mock }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

const answer: ChatMessage = {
  id: 'answer',
  role: 'ai',
  content: 'Old Trafford opened in 1910.',
  createdAt: '2026-10-27T12:00:00Z',
  status: 'complete',
};

beforeEach(() => {
  vi.resetAllMocks();
  mock.createChat.mockResolvedValue({ threadId: 'new-thread' });
  mock.allChats.mockResolvedValue([]);
  mock.messages.mockResolvedValue({ messages: [] });
});
afterEach(cleanup);

describe('conversation request lifecycle', () => {
  it('keeps the latest selected conversation when history requests arrive out of order', async () => {
    const older = deferred<{ messages: ChatMessage[] }>();
    const newer = deferred<{ messages: ChatMessage[] }>();
    mock.messages.mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise);
    const { result } = renderHook(() => useConversation(vi.fn()));
    let first!: Promise<void>;
    let second!: Promise<void>;
    act(() => {
      first = result.current.openChat('older');
    });
    act(() => {
      second = result.current.openChat('newer');
    });
    await act(async () => {
      newer.resolve({ messages: [answer] });
      await second;
    });
    await act(async () => {
      older.resolve({ messages: [] });
      await first;
    });
    expect(result.current.threadId).toBe('newer');
    expect(result.current.messages).toEqual([answer]);
    expect(result.current.isLoading).toBe(false);
  });

  it('does not restore a pending history request after New Chat', async () => {
    const history = deferred<{ messages: ChatMessage[] }>();
    mock.messages.mockReturnValue(history.promise);
    const { result } = renderHook(() => useConversation(vi.fn()));
    let opening!: Promise<void>;
    act(() => {
      opening = result.current.openChat('older');
    });
    act(() => result.current.newChat());
    await act(async () => {
      history.resolve({ messages: [answer] });
      await opening;
    });
    expect(result.current.threadId).toBeNull();
    expect(result.current.messages).toEqual([]);
  });

  it('ignores late events and cleanup from an abandoned answer while the next answer runs', async () => {
    const firstStream = deferred<void>();
    const secondStream = deferred<void>();
    let oldEvent!: (event: StreamEvent) => void;
    mock.stream
      .mockImplementationOnce((_id, _text, _requestId, onEvent) => {
        oldEvent = onEvent;
        return firstStream.promise;
      })
      .mockReturnValueOnce(secondStream.promise);
    const { result } = renderHook(() => useConversation(vi.fn()));
    let first!: Promise<void>;
    let second!: Promise<void>;
    act(() => {
      first = result.current.send('First question');
    });
    await waitFor(() => expect(mock.stream).toHaveBeenCalledTimes(1));
    const oldSignal = mock.stream.mock.calls[0][4] as AbortSignal;
    act(() => result.current.newChat());
    act(() => {
      second = result.current.send('Second question');
    });
    await waitFor(() => expect(mock.stream).toHaveBeenCalledTimes(2));
    await act(async () => {
      oldEvent({ type: 'started', threadId: 'new-thread', messageId: 'stale-answer' });
      firstStream.resolve();
      await first;
    });
    expect(oldSignal.aborted).toBe(true);
    expect(result.current.isSending).toBe(true);
    expect(result.current.messages.map((message) => message.content)).toEqual(['Second question']);
    await act(async () => {
      secondStream.resolve();
      await second;
    });
  });

  it('prevents duplicate submissions before state has re-rendered', async () => {
    const creation = deferred<{ threadId: string }>();
    mock.createChat.mockReturnValue(creation.promise);
    const { result } = renderHook(() => useConversation(vi.fn()));
    let sending!: Promise<void>;
    act(() => {
      sending = result.current.send('A question');
      void result.current.send('A second click');
    });
    expect(mock.createChat).toHaveBeenCalledTimes(1);
    await act(async () => {
      creation.resolve({ threadId: 'new-thread' });
      await sending;
    });
    expect(mock.stream).toHaveBeenCalledTimes(1);
  });

  it('honors Stop while a conversation is still being created', async () => {
    const creation = deferred<{ threadId: string }>();
    mock.createChat.mockReturnValue(creation.promise);
    const { result } = renderHook(() => useConversation(vi.fn()));
    let sending!: Promise<void>;
    act(() => {
      sending = result.current.send('A question');
    });
    act(() => result.current.stop());
    await act(async () => {
      creation.resolve({ threadId: 'new-thread' });
      await sending;
    });
    expect(mock.stream).not.toHaveBeenCalled();
    expect(result.current.isSending).toBe(false);
    expect(result.current.error).toBe('');
  });

  it('reconciles a failed stream using the newly created conversation id', async () => {
    mock.stream.mockRejectedValue(new Error('network failed'));
    mock.messages.mockResolvedValue({ messages: [answer] });
    const { result } = renderHook(() => useConversation(vi.fn()));
    await act(async () => {
      await result.current.send('A question');
    });
    expect(mock.messages).toHaveBeenCalledWith('new-thread');
    expect(result.current.messages).toEqual([answer]);
    expect(result.current.error).toContain('Could not complete');
  });

  it('marks a partial answer cancelled when stopped and aborts on unmount', async () => {
    mock.stream.mockImplementation((_id, _text, _requestId, onEvent, signal: AbortSignal) => {
      onEvent({ type: 'started', threadId: 'new-thread', messageId: 'answer' });
      onEvent({ type: 'delta', messageId: 'answer', text: 'Partial answer' });
      return new Promise((_resolve, reject) =>
        signal.addEventListener('abort', () => reject(signal.reason)),
      );
    });
    const { result, unmount } = renderHook(() => useConversation(vi.fn()));
    let sending!: Promise<void>;
    act(() => {
      sending = result.current.send('A question');
    });
    await waitFor(() => expect(result.current.messages).toHaveLength(2));
    await act(async () => {
      result.current.stop();
      await sending;
    });
    expect(result.current.messages[1]).toMatchObject({
      content: 'Partial answer',
      status: 'cancelled',
    });
    act(() => {
      sending = result.current.send('Another question');
    });
    await waitFor(() => expect(mock.stream).toHaveBeenCalledTimes(2));
    const signal = mock.stream.mock.calls[1][4] as AbortSignal;
    unmount();
    await sending;
    expect(signal.aborted).toBe(true);
  });

  it('replaces an edited question, drops later messages and streams with its id', async () => {
    const saved: ChatMessage[] = [
      {
        id: 'q1',
        role: 'human',
        content: 'First',
        createdAt: answer.createdAt,
        status: 'complete',
      },
      { ...answer, id: 'a1' },
      {
        id: 'q2',
        role: 'human',
        content: 'Second',
        createdAt: answer.createdAt,
        status: 'complete',
      },
      { ...answer, id: 'a2' },
    ];
    mock.messages.mockResolvedValue({ messages: saved });
    mock.edit.mockImplementation((_thread, _id, _text, _requestId, onEvent) => {
      onEvent({ type: 'started', threadId: 'thread', messageId: 'a3' });
      onEvent({ type: 'delta', messageId: 'a3', text: 'New answer' });
      return Promise.resolve();
    });
    const { result } = renderHook(() => useConversation(vi.fn()));
    await act(async () => {
      await result.current.openChat('thread');
    });
    act(() => result.current.setPrompt('Unsent draft'));
    await act(async () => {
      await result.current.edit('q1', '  Edited first  ');
    });
    expect(mock.edit).toHaveBeenCalledWith(
      'thread',
      'q1',
      'Edited first',
      expect.any(String),
      expect.any(Function),
      expect.any(AbortSignal),
    );
    expect(mock.stream).not.toHaveBeenCalled();
    expect(result.current.messages.map(({ id, content }) => [id, content])).toEqual([
      ['q1', 'Edited first'],
      ['a3', 'New answer'],
    ]);
    expect(result.current.prompt).toBe('Unsent draft');
    expect(result.current.isSending).toBe(false);
  });
});
