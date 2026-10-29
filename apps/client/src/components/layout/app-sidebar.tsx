import { Sidebar } from '@/components/ui/sidebar/Sidebar';
import { SidebarContent } from '@/components/ui/sidebar/SidebarContent';
import { SidebarGroup } from '@/components/ui/sidebar/SidebarGroup';
import { SidebarGroupContent } from '@/components/ui/sidebar/SidebarGroupContent';
import { SidebarGroupLabel } from '@/components/ui/sidebar/SidebarGroupLabel';
import { SidebarHeader } from '@/components/ui/sidebar/SidebarHeader';
import { SidebarMenu } from '@/components/ui/sidebar/SidebarMenu';
import { SidebarMenuButton } from '@/components/ui/sidebar/SidebarMenuButton';
import { SidebarMenuItem } from '@/components/ui/sidebar/SidebarMenuItem';
import { useSidebar } from '@/hooks/use-sidebar';
import { APP_NAME, CREST_SRC } from '@/lib/site';
import { Brain, Plus } from 'lucide-react';
import type { AppSidebarProps, NavigationAction } from './types';

/**
 * The active conversation is marked with a red edge, the sidebar's only use of
 * the brand color, so the current place stays obvious without loud fills.
 */
const ACTIVE_ITEM =
  'relative data-active:before:absolute data-active:before:inset-y-1.5 data-active:before:left-0 data-active:before:w-0.5 data-active:before:rounded-full data-active:before:bg-sidebar-primary';

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
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="flex-row items-center gap-3 px-4 pt-5 pb-4">
        <img src={CREST_SRC} alt="" width={36} height={36} className="size-9 shrink-0" />
        <span className="font-heading text-xl leading-none font-semibold">{APP_NAME}</span>
      </SidebarHeader>
      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              <SidebarMenuItem>
                <SidebarMenuButton
                  variant="outline"
                  size="lg"
                  className="h-10 justify-start font-medium"
                  onClick={() => navigate(onNewChat)}
                  disabled={disabled}
                >
                  <Plus />
                  <span>New chat</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  className={ACTIVE_ITEM}
                  onClick={() => navigate(onOpenMemory)}
                  disabled={disabled}
                  isActive={isMemoryOpen}
                >
                  <Brain />
                  <span>Memory</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Chats</SidebarGroupLabel>
          <SidebarGroupContent>
            {chats.length ? (
              <SidebarMenu>
                {chats.map((chat) => (
                  <SidebarMenuItem key={chat.threadId}>
                    <SidebarMenuButton
                      className={ACTIVE_ITEM}
                      onClick={() => navigate(() => onOpenChat(chat.threadId))}
                      disabled={disabled || isSending}
                      isActive={!isMemoryOpen && activeThreadId === chat.threadId}
                      title={chat.title}
                    >
                      <span>{chat.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            ) : (
              <p className="px-2 py-1 text-xs text-muted-foreground">
                Your chats will appear here.
              </p>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
