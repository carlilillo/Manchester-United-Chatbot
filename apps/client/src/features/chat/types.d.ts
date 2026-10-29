import type { MessageFeedback } from '@/lib/types';
import type { TraceLineProps } from '@/components/ui/trace/types';
import type { ChatMessage, ChatSummary } from '@united/contracts';

/** A visitor's rating of an answer; null clears a previous rating. */
export type Feedback = MessageFeedback;

export type FeedbackHandler = (messageId: string, feedback: Feedback) => void;

/** Saved conversation summaries received after sending an answer. */
export type HistoryChangeHandler = (chats: ChatSummary[]) => void;

/** Terminal states used when an answer cannot finish normally. */
export type InterruptedMessageStatus = 'failed' | 'cancelled';

/** Visual status understood by a TraceLine. */
export type TraceStatus = TraceLineProps['status'];

/** A page an answer drew on, as listed beneath it. */
export type MessageSource = NonNullable<ChatMessage['sources']>[number];
