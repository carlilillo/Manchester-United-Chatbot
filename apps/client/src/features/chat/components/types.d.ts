import type { useConversation } from '@/features/chat/hooks/use-conversation';
import type { FeedbackHandler } from '@/features/chat/types';
import type { Activity, ChatMessage } from '@united/contracts';

/** Props for ActivityTrace. */
export type ActivityTraceProps = { activity: Activity[] };

export interface ChatComposerProps {
  prompt: string;
  error: string;
  isSending: boolean;
  isLoading: boolean;
  onPromptChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  onDismissError: () => void;
}

/** Props for ChatWorkspace. */
export type ChatWorkspaceProps = {
  conversation: ReturnType<typeof useConversation>;
};

/** Props for MessageActions. */
export type MessageActionsProps = {
  message: ChatMessage;
  onFeedback: FeedbackHandler;
};

/** Props for TranscriptMessage. */
export type TranscriptMessageProps = {
  message: ChatMessage;
  onFeedback: FeedbackHandler;
};

/** Props for Transcript. */
export type TranscriptProps = {
  messages: ChatMessage[];
  onFeedback: FeedbackHandler;
};

/** Props for Welcome. */
export type WelcomeProps = {
  onSuggestion: (prompt: string) => void;
  disabled: boolean;
};
