import type { ChatMessage, StreamEvent } from '@united/contracts';

/** Anonymous visitor identity returned after establishing the session cookie. */
export interface SessionResponse {
  userId: string;
}

/** Conversation identity returned when a new chat is created. */
export interface CreateChatResponse {
  threadId: string;
  title: string;
}

/** Persisted transcript returned by the messages endpoint. */
export interface ChatMessagesResponse extends CreateChatResponse {
  messages: ChatMessage[];
  status: string;
}

/** The API and SSE reader share the same validated event callback. */
export type StreamEventHandler = (event: StreamEvent) => void;

export type MessageFeedback = NonNullable<ChatMessage['feedback']> | null;
