import type { ChatMessage, ChatSummary } from '@united/contracts';

export type Feedback = NonNullable<ChatMessage['feedback']> | null;

export type FeedbackHandler = (messageId: string, feedback: Feedback) => void;

/** Saved conversation summaries received after sending an answer. */
export type HistoryChangeHandler = (chats: ChatSummary[]) => void;

/** Terminal states used when an answer cannot finish normally. */
export type InterruptedMessageStatus = 'failed' | 'cancelled';
