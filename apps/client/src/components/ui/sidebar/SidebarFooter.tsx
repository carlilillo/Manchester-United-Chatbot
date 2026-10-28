import { cn } from 'cn';
import type { SidebarFooterProps } from './types';

/** Anchors supporting navigation beneath the sidebar content. */
export function SidebarFooter({ className, ...props }: SidebarFooterProps) {
  return (
    <div
      data-slot="sidebar-footer"
      data-sidebar="footer"
      className={cn('flex flex-col gap-2 p-2', className)}
      {...props}
    />
  );
}
