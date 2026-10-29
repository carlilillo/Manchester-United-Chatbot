import { AppHeader } from '@/components/layout/app-header';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { LoadingScreen } from '@/components/layout/loading-screen';
import { WorkspaceError } from '@/components/layout/workspace-error';
import { SidebarInset } from '@/components/ui/sidebar/SidebarInset';
import { SidebarProvider } from '@/components/ui/sidebar/SidebarProvider';
import { ChatWorkspace } from '@/features/chat/components/chat-workspace';
import { useConversation } from '@/features/chat/hooks/use-conversation';
import { MemoryPage } from '@/features/memory/components/memory-page';
import { useSession } from '@/hooks/use-session';
import type { ChatSummary } from '@united/contracts';
import { useState } from 'react';
import { Toaster } from 'sonner';
import type { WorkspaceScreen } from './types';

/**
 * Header title for the current screen. Only an open conversation has one; the
 * welcome and memory screens carry their own headings.
 */
function headerTitle(screen: WorkspaceScreen, threadId: string | null, chats: ChatSummary[]) {
  if (screen !== 'chat' || !threadId) return '';
  return chats.find((chat) => chat.threadId === threadId)?.title ?? 'Conversation';
}

/** Composes the application shell and selects the chat or memory screen. */
export function App() {
  const session = useSession();
  const conversation = useConversation(session.setChats);
  const [screen, setScreen] = useState<WorkspaceScreen>('chat');

  function newChat() {
    conversation.newChat();
    setScreen('chat');
  }

  function openChat(id: string) {
    setScreen('chat');
    void conversation.openChat(id);
  }

  return (
    <SidebarProvider defaultOpen className="h-dvh min-h-0 overflow-hidden">
      <Toaster theme="dark" position="bottom-right" />
      <AppSidebar
        chats={session.chats}
        activeThreadId={conversation.threadId}
        isMemoryOpen={screen === 'memory'}
        disabled={session.status !== 'ready'}
        isSending={conversation.isSending}
        onNewChat={newChat}
        onOpenMemory={() => setScreen('memory')}
        onOpenChat={openChat}
      />
      {/* min-w-0 and overflow-hidden keep wide content from scrolling the page sideways. */}
      <SidebarInset className="min-h-0 min-w-0 overflow-hidden">
        <AppHeader title={headerTitle(screen, conversation.threadId, session.chats)} />
        {session.status === 'loading' && <LoadingScreen />}
        {session.status === 'error' && <WorkspaceError onRetry={session.retry} />}
        {session.status === 'ready' &&
          (screen === 'memory' && session.memory ? (
            <MemoryPage memory={session.memory} onSaved={session.setMemory} />
          ) : (
            <ChatWorkspace conversation={conversation} />
          ))}
      </SidebarInset>
    </SidebarProvider>
  );
}
