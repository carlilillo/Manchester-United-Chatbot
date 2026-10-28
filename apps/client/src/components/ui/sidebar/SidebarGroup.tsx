import { cn } from 'cn';
import type { SidebarGroupProps } from './types';

/** Groups a related set of sidebar navigation controls. */
export function SidebarGroup({ className, ...props }: SidebarGroupProps) {
  return (
    <div
      data-slot="sidebar-group"
      data-sidebar="group"
      className={cn('relative flex w-full min-w-0 flex-col p-2', className)}
      {...props}
    />
  );
}
