import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App } from '../src/App';

const mock = vi.hoisted(() => ({
  session: vi.fn(),
  memory: vi.fn(),
  chats: vi.fn(),
  allChats: vi.fn(),
  messages: vi.fn(),
  createChat: vi.fn(),
  stream: vi.fn(),
  saveMemory: vi.fn(),
  feedback: vi.fn(),
}));
vi.mock('../src/lib/api', () => ({ api: mock }));

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
  mock.session.mockResolvedValue({ userId: 'u' });
  mock.memory.mockResolvedValue({
    enabled: true,
    responseStyle: 'friendly',
    notes: '',
    version: 0,
    updatedAt: null,
  });
  mock.chats.mockResolvedValue([
    { threadId: 'thread-1', title: 'Old Trafford history', updatedAt: new Date().toISOString() },
  ]);
  mock.allChats.mockResolvedValue([
    { threadId: 'thread-1', title: 'Old Trafford history', updatedAt: new Date().toISOString() },
  ]);
  mock.messages.mockResolvedValue({
    threadId: 'thread-1',
    title: 'Old Trafford history',
    status: 'idle',
    messages: [],
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('chat workspace', () => {
  it('initializes the cookie before loading memory and history, then opens a new chat', async () => {
    render(<App />);
    await screen.findByText('Every era.');
    expect(mock.session).toHaveBeenCalledTimes(1);
    expect(mock.memory).toHaveBeenCalledTimes(1);
    expect(mock.allChats).toHaveBeenCalledTimes(1);
    expect(mock.session.mock.invocationCallOrder[0]).toBeLessThan(
      mock.memory.mock.invocationCallOrder[0],
    );
    expect(screen.getByText('Old Trafford history')).toBeTruthy();
    fireEvent.click(screen.getByText('Memory'));
    expect(await screen.findByText('Make it yours.')).toBeTruthy();
    fireEvent.click(screen.getByText('New Chat'));
    expect(await screen.findByText('Every era.')).toBeTruthy();
    await waitFor(() => expect(mock.messages).not.toHaveBeenCalled());
  });

  it('never renders a provider error from the chat stream', async () => {
    mock.createChat.mockResolvedValue({ threadId: 'new-thread', title: 'New Chat' });
    mock.stream.mockImplementation(async (_threadId, _text, _requestId, onEvent) => {
      onEvent({ type: 'started', threadId: 'new-thread', messageId: 'assistant-1' });
      onEvent({
        type: 'error',
        messageId: 'assistant-1',
        error: 'unsupported reasoning level: private provider detail',
      });
    });
    render(<App />);
    await screen.findByText('Every era.');
    fireEvent.change(screen.getByRole('textbox', { name: 'Message' }), {
      target: { value: 'Tell me about United' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    expect(await screen.findByText('The answer stopped because of an error.')).toBeTruthy();
    expect(screen.queryByText(/unsupported reasoning level/i)).toBeNull();
  });
});

describe('workspace recovery and preferences', () => {
  it('retries a failed session without loading private data before the cookie exists', async () => {
    mock.session.mockRejectedValueOnce(new Error('Connection unavailable'));
    render(<App />);
    await screen.findByRole('alert');
    expect(mock.memory).not.toHaveBeenCalled();
    expect(mock.allChats).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByText('Every era.');
    expect(mock.session).toHaveBeenCalledTimes(2);
    expect(mock.memory).toHaveBeenCalledTimes(1);
  });

  it('saves preferences with their version and discards edits when the screen is reopened', async () => {
    mock.saveMemory.mockImplementation(async (input) => ({
      ...input,
      version: 1,
      updatedAt: '2026-10-27T12:00:00Z',
    }));
    render(<App />);
    await screen.findByText('Every era.');
    fireEvent.click(screen.getByText('Memory'));
    const notes = screen.getByLabelText('HOW SHOULD I ANSWER?');
    fireEvent.change(notes, { target: { value: 'Keep answers concise.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save preferences' }));
    await waitFor(() =>
      expect(mock.saveMemory).toHaveBeenCalledWith({
        enabled: true,
        responseStyle: 'friendly',
        notes: 'Keep answers concise.',
        version: 0,
      }),
    );
    await screen.findByText('Memory saved');
    fireEvent.change(notes, { target: { value: 'Unsaved change' } });
    fireEvent.click(screen.getByText('New Chat'));
    fireEvent.click(screen.getByText('Memory'));
    expect((screen.getByLabelText('HOW SHOULD I ANSWER?') as HTMLTextAreaElement).value).toBe(
      'Keep answers concise.',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect((screen.getByLabelText('HOW SHOULD I ANSWER?') as HTMLTextAreaElement).value).toBe('');
    expect(mock.saveMemory).toHaveBeenCalledTimes(1);
  });

  it('preserves a failed preference draft for retry', async () => {
    mock.saveMemory.mockRejectedValue(new Error('Temporary failure'));
    render(<App />);
    await screen.findByText('Every era.');
    fireEvent.click(screen.getByText('Memory'));
    fireEvent.change(screen.getByLabelText('HOW SHOULD I ANSWER?'), {
      target: { value: 'Keep this draft.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save preferences' }));
    await screen.findByText('Could not save your preferences. Please try again.');
    expect((screen.getByLabelText('HOW SHOULD I ANSWER?') as HTMLTextAreaElement).value).toBe(
      'Keep this draft.',
    );
    expect(
      (screen.getByRole('button', { name: 'Save preferences' }) as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  it('does not send Enter presses during composition or with Shift', async () => {
    render(<App />);
    await screen.findByText('Every era.');
    const input = screen.getByRole('textbox', { name: 'Message' });
    fireEvent.change(input, { target: { value: 'A question in progress' } });
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    expect(mock.createChat).not.toHaveBeenCalled();
  });
});
