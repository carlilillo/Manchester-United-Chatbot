import { AppHeader } from '@/components/layout/app-header';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { LoadingScreen } from '@/components/layout/loading-screen';
import { Button } from '@/components/ui/button';
import { SidebarInset } from '@/components/ui/sidebar/SidebarInset';
import { SidebarProvider } from '@/components/ui/sidebar/SidebarProvider';
import { ChatWorkspace } from '@/features/chat/components/chat-workspace';
import { useConversation } from '@/features/chat/hooks/use-conversation';
import { MemoryPage } from '@/features/memory/components/memory-page';
import { useSession } from '@/hooks/use-session';
import { useState } from 'react';
import { Toaster } from 'sonner';
import type { WorkspaceScreen } from './types';

/** Composes the application shell and selects the chat or preferences screen. */
export function App() {
  const session = useSession();
  const conversation = useConversation(session.setChats);
  const [screen, setScreen] = useState<WorkspaceScreen>('chat');
  const activeChat = session.chats.find((chat) => chat.threadId === conversation.threadId);
  const title =
    screen === 'memory'
      ? 'MEMORY'
      : conversation.threadId
        ? (activeChat?.title ?? 'CONVERSATION')
        : 'NEW CONVERSATION';

  function newChat() {
    conversation.newChat();
    setScreen('chat');
  }

  function openChat(id: string) {
    setScreen('chat');
    void conversation.openChat(id);
  }

  return (
    <SidebarProvider defaultOpen>
      <div className="app-shell">
        <Toaster richColors position="bottom-right" />
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
        <SidebarInset className="main-inset">
          <AppHeader title={title} />
          {session.status === 'loading' && <LoadingScreen />}
          {session.status === 'error' && (
            <div className="loading-screen" role="alert">
              <p>Could not load your workspace. Please try again.</p>
              <Button onClick={session.retry}>Try again</Button>
            </div>
          )}
          {session.status === 'ready' &&
            (screen === 'memory' && session.memory ? (
              <MemoryPage memory={session.memory} onSaved={session.setMemory} />
            ) : (
              <ChatWorkspace conversation={conversation} />
            ))}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
