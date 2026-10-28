import { Sidebar } from '@/components/ui/sidebar/Sidebar';
import { SidebarContent } from '@/components/ui/sidebar/SidebarContent';
import { SidebarFooter } from '@/components/ui/sidebar/SidebarFooter';
import { SidebarGroup } from '@/components/ui/sidebar/SidebarGroup';
import { SidebarGroupContent } from '@/components/ui/sidebar/SidebarGroupContent';
import { SidebarGroupLabel } from '@/components/ui/sidebar/SidebarGroupLabel';
import { SidebarHeader } from '@/components/ui/sidebar/SidebarHeader';
import { SidebarMenu } from '@/components/ui/sidebar/SidebarMenu';
import { SidebarMenuButton } from '@/components/ui/sidebar/SidebarMenuButton';
import { SidebarMenuItem } from '@/components/ui/sidebar/SidebarMenuItem';
import { useSidebar } from '@/hooks/use-sidebar';
import { History, MessageCircle, Plus, Settings2 } from 'lucide-react';
import type { NavigationAction } from './types';
import type { AppSidebarProps } from './types';

/** Provides workspace navigation and closes the mobile drawer after selection. */
export function AppSidebar({
  chats,
  activeThreadId,
  isMemoryOpen,
  disabled,
  isSending,
  onNewChat,
  onOpenMemory,
  onOpenChat,
}: AppSidebarProps) {
  const { isMobile, setOpenMobile } = useSidebar();

  function navigate(action: NavigationAction) {
    action();
    if (isMobile) setOpenMobile(false);
  }

  return (
    <Sidebar collapsible="offcanvas" className="app-sidebar">
      <SidebarHeader className="sidebar-brand">
        <div className="brand-mark">
          U<span>·</span>
        </div>
        <div>
          <strong>UNITED ARCHIVE</strong>
          <small>THE CLUB, IN CONTEXT</small>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate(onNewChat)}
                  disabled={disabled}
                  className="new-chat-button"
                >
                  <Plus />
                  <span>New Chat</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate(onOpenMemory)}
                  disabled={disabled}
                  isActive={isMemoryOpen}
                >
                  <Settings2 />
                  <span>Memory</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="history-group">
          <SidebarGroupLabel>
            <History size={13} /> CONVERSATIONS
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {chats.length ? (
              <SidebarMenu>
                {chats.map((chat) => (
                  <SidebarMenuItem key={chat.threadId}>
                    <SidebarMenuButton
                      onClick={() => navigate(() => onOpenChat(chat.threadId))}
                      disabled={disabled || isSending}
                      isActive={!isMemoryOpen && activeThreadId === chat.threadId}
                      title={chat.title}
                    >
                      <MessageCircle />
                      <span>{chat.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            ) : (
              <p className="empty-history">Your conversations will appear here.</p>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="sidebar-foot">
          <span className="live-indicator" /> THE UNITED KNOWLEDGE DESK
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
