import { cn } from 'cn';
import type { SidebarMenuProps } from './types';

/** Provides the list structure for sidebar navigation. */
export function SidebarMenu({ className, ...props }: SidebarMenuProps) {
  return (
    <ul
      data-slot="sidebar-menu"
      data-sidebar="menu"
      className={cn('flex w-full min-w-0 flex-col gap-0', className)}
      {...props}
    />
  );
}
