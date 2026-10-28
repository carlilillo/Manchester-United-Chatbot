import { cn } from 'cn';
import type { SidebarHeaderProps } from './types';

/** Arranges branding or controls at the top of the sidebar. */
export function SidebarHeader({ className, ...props }: SidebarHeaderProps) {
  return (
    <div
      data-slot="sidebar-header"
      data-sidebar="header"
      className={cn('flex flex-col gap-2 p-2', className)}
      {...props}
    />
  );
}
