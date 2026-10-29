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

/** The history endpoint returns at most this many chats per page. */
export const CHAT_PAGE_SIZE = 30;

/** Sends a cookie-authenticated JSON request to the same-origin API. */
function request(path: string, init?: RequestInit) {
  return fetch(`/api${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

/** Prefers the API's own message so failures stay explainable to the visitor. */
async function errorFrom(response: Response, fallback: string) {
  const data = await response.json().catch(() => null);
  return new Error(data?.message ?? `${fallback} (${response.status})`);
}

/** Parses a JSON response body (an empty body yields null) and rejects non-2xx statuses. */
async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await request(path, init);
  if (!response.ok) throw await errorFrom(response, 'Request failed');
  return (await response.json().catch(() => null)) as T;
}

/** Sends a question and reads the answer stream; framing and validation are delegated to the reader. */
async function openStream(
  path: string,
  method: 'POST' | 'PUT',
  text: string,
  requestId: string,
  onEvent: StreamEventHandler,
  signal: AbortSignal,
) {
  const response = await request(path, {
    method,
    body: JSON.stringify({ text, requestId }),
    signal,
  });
  if (!response.ok || !response.body) throw await errorFrom(response, 'Chat request failed');
  await readEventStream(response.body, onEvent);
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
      if (page.length < CHAT_PAGE_SIZE) return result;
    }
  },
  createChat: () => json<CreateChatResponse>('/chats', { method: 'POST' }),
  messages: (threadId: string) => json<ChatMessagesResponse>(`/chats/${threadId}/messages`),
  feedback: (threadId: string, messageId: string, feedback: MessageFeedback) =>
    json<ChatMessage>(`/chats/${threadId}/messages/${messageId}/feedback`, {
      method: 'PATCH',
      body: JSON.stringify({ feedback }),
    }),
  /** Appends a question and streams its answer. */
  stream: (
    threadId: string,
    text: string,
    requestId: string,
    onEvent: StreamEventHandler,
    signal: AbortSignal,
  ) => openStream(`/chats/${threadId}/messages`, 'POST', text, requestId, onEvent, signal),
  /** Replaces a question, discarding the messages after it, and streams a new answer. */
  edit: (
    threadId: string,
    messageId: string,
    text: string,
    requestId: string,
    onEvent: StreamEventHandler,
    signal: AbortSignal,
  ) =>
    openStream(`/chats/${threadId}/messages/${messageId}`, 'PUT', text, requestId, onEvent, signal),
};
