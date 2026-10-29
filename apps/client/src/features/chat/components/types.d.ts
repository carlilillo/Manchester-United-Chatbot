import type { useConversation } from '@/features/chat/hooks/use-conversation';
import type { FeedbackHandler, MessageSource } from '@/features/chat/types';
import type { Activity, ChatMessage } from '@united/contracts';
import type { ReactNode } from 'react';

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

/** Props for ChatDisclaimer. */
export type ChatDisclaimerProps = { className?: string };

/** Props for ChatWorkspace. */
export type ChatWorkspaceProps = {
  conversation: ReturnType<typeof useConversation>;
};

/** Props for the icon buttons inside MessageActions. */
export type ActionButtonProps = {
  label: string;
  pressed?: boolean;
  onClick: () => void;
  children: ReactNode;
};

/** Props for MessageActions. */
export type MessageActionsProps = {
  message: ChatMessage;
  onFeedback: FeedbackHandler;
};

/** Props for MessageSources. */
export type MessageSourcesProps = { sources: MessageSource[] };

/** Props for MessageTime. */
export type MessageTimeProps = { value: string };

/** Props for UserMessage. */
export type UserMessageProps = { message: ChatMessage };

/** Props for AssistantMessage. */
export type AssistantMessageProps = {
  message: ChatMessage;
  onFeedback: FeedbackHandler;
};

/** Props for Transcript. */
export type TranscriptProps = {
  messages: ChatMessage[];
  onFeedback: FeedbackHandler;
};
