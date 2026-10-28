import { cn } from 'cn';
import type { SidebarMenuItemProps } from './types';

/** Wraps one navigation entry and its optional actions. */
export function SidebarMenuItem({ className, ...props }: SidebarMenuItemProps) {
  return (
    <li
      data-slot="sidebar-menu-item"
      data-sidebar="menu-item"
      className={cn('group/menu-item relative', className)}
      {...props}
    />
  );
}
