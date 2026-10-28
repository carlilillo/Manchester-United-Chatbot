import { cn } from 'cn';
import type { SidebarMenuSubItemProps } from './types';

/** Wraps a single nested navigation entry. */
export function SidebarMenuSubItem({ className, ...props }: SidebarMenuSubItemProps) {
  return (
    <li
      data-slot="sidebar-menu-sub-item"
      data-sidebar="menu-sub-item"
      className={cn('group/menu-sub-item relative', className)}
      {...props}
    />
  );
}
