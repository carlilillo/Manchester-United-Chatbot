import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../src/lib/api';

afterEach(() => vi.unstubAllGlobals());

describe('chat API client', () => {
  it('loads every page of chat history', async () => {
    const first = Array.from({ length: 30 }, (_, index) => ({
      threadId: `t-${index}`,
      title: `Chat ${index}`,
      updatedAt: '2026-10-24T00:00:00Z',
    }));
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(first), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            { threadId: 't-30', title: 'Chat 30', updatedAt: '2026-10-24T00:00:00Z' },
          ]),
          { status: 200 },
        ),
      );
    vi.stubGlobal('fetch', fetchMock);
    expect(await api.allChats()).toHaveLength(31);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/chats?offset=0',
      '/api/chats?offset=30',
    ]);
  });

  it('parses SSE events even when a JSON event is split across network chunks', async () => {
    const encoder = new TextEncoder();
    const chunks = [
      'data: {"type":"started","threadId":"t","mes',
      'sageId":"m"}\n\ndata: {"type":"delta","messageId":"m","text":"Hello"}\n\n',
    ];
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          new ReadableStream({
            start(controller) {
              for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
              controller.close();
            },
          }),
          { status: 200 },
        ),
      ),
    );
    const events: unknown[] = [];
    await api.stream(
      't',
      'Hello',
      crypto.randomUUID(),
      (event) => events.push(event),
      new AbortController().signal,
    );
    expect(events).toEqual([
      { type: 'started', threadId: 't', messageId: 'm' },
      { type: 'delta', messageId: 'm', text: 'Hello' },
    ]);
    expect(fetch).toHaveBeenCalledWith(
      '/api/chats/t/messages',
      expect.objectContaining({ credentials: 'include', method: 'POST' }),
    );
  });
});

it('handles CRLF frames, comments, and multiline data across byte boundaries', async () => {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(
    ': keepalive\r\ndata:{"type":"delta",\r\ndata: "messageId":"m","text":"United ⚽"}\r\n\r\n',
  );
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(
        new ReadableStream({
          start(controller) {
            for (const byte of bytes) controller.enqueue(Uint8Array.of(byte));
            controller.close();
          },
        }),
      ),
    ),
  );
  const events: unknown[] = [];
  await api.stream(
    't',
    'Hello',
    crypto.randomUUID(),
    (event) => events.push(event),
    new AbortController().signal,
  );
  expect(events).toEqual([{ type: 'delta', messageId: 'm', text: 'United ⚽' }]);
});

it('cancels and releases a stream when its payload fails validation', async () => {
  const cancel = vi.fn();
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('data: {"type":"unknown"}\n\n'));
    },
    cancel,
  });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body)));
  await expect(
    api.stream('t', 'Hello', crypto.randomUUID(), vi.fn(), new AbortController().signal),
  ).rejects.toThrow();
  expect(cancel).toHaveBeenCalledTimes(1);
  expect(body.locked).toBe(false);
});
