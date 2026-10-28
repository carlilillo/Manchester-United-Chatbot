import type { ChatSummary } from '@united/contracts';

/** Props for AppHeader. */
export type AppHeaderProps = { title: string };

export interface AppSidebarProps {
  chats: ChatSummary[];
  activeThreadId: string | null;
  isMemoryOpen: boolean;
  disabled: boolean;
  isSending: boolean;
  onNewChat: () => void;
  onOpenMemory: () => void;
  onOpenChat: (id: string) => void;
}

/** A navigation action invoked before dismissing the mobile drawer. */
export type NavigationAction = () => void;
