import { readEventStream } from './event-stream';
import {
  type ChatMessage,
  type ChatSummary,
  type Memory,
  type MemoryInput,
} from '@united/contracts';
import type {
  ChatMessagesResponse,
  CreateChatResponse,
  MessageFeedback,
  SessionResponse,
  StreamEventHandler,
} from './types';

/** Sends cookie-authenticated JSON requests to the same-origin API. */
async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message ?? `Request failed (${response.status})`);
  return data as T;
}

/** Typed endpoints shared by session, conversation, and preference hooks. */
export const api = {
  session: () => json<SessionResponse>('/session', { method: 'POST' }),
  memory: () => json<Memory>('/memory'),
  saveMemory: (value: MemoryInput) =>
    json<Memory>('/memory', { method: 'PUT', body: JSON.stringify(value) }),
  chats: (offset = 0) => json<ChatSummary[]>(`/chats?offset=${offset}`),
  /** Loads history until the API returns its final, partial page. */
  async allChats() {
    const result: ChatSummary[] = [];
    for (;;) {
      const page = await api.chats(result.length);
      result.push(...page);
      if (page.length < 30) return result;
    }
  },
  createChat: () => json<CreateChatResponse>('/chats', { method: 'POST' }),
  messages: (threadId: string) => json<ChatMessagesResponse>(`/chats/${threadId}/messages`),
  feedback: (threadId: string, messageId: string, feedback: MessageFeedback) =>
    json<ChatMessage>(`/chats/${threadId}/messages/${messageId}/feedback`, {
      method: 'PATCH',
      body: JSON.stringify({ feedback }),
    }),
  /** Opens an answer stream; framing and validation are delegated to the reader. */
  async stream(
    threadId: string,
    text: string,
    requestId: string,
    onEvent: StreamEventHandler,
    signal: AbortSignal,
  ) {
    const response = await fetch(`/api/chats/${threadId}/messages`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, requestId }),
      signal,
    });
    if (!response.ok || !response.body) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message ?? `Chat request failed (${response.status})`);
    }
    await readEventStream(response.body, onEvent);
  },
};
