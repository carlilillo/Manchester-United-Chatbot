import { cn } from 'cn';
import type { SidebarGroupContentProps } from './types';

/** Contains the menu content for a navigation group. */
export function SidebarGroupContent({ className, ...props }: SidebarGroupContentProps) {
  return (
    <div
      data-slot="sidebar-group-content"
      data-sidebar="group-content"
      className={cn('w-full text-sm', className)}
      {...props}
    />
  );
}
