import { Button } from '@/components/ui/button';
import { useSidebar } from '@/hooks/use-sidebar';
import { cn } from 'cn';
import { PanelLeftIcon } from 'lucide-react';
import type { SidebarTriggerProps } from './types';

/** Toggles the navigation using the sidebar context. */
export function SidebarTrigger({ className, onClick, ...props }: SidebarTriggerProps) {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon-sm"
      className={cn(className)}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      <PanelLeftIcon />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
}
