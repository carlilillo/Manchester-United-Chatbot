import { Separator } from '@/components/ui/separator';
import { cn } from 'cn';
import type { SidebarSeparatorProps } from './types';

/** Divides sidebar sections with consistent spacing. */
export function SidebarSeparator({ className, ...props }: SidebarSeparatorProps) {
  return (
    <Separator
      data-slot="sidebar-separator"
      data-sidebar="separator"
      className={cn('mx-2 w-auto bg-sidebar-border', className)}
      {...props}
    />
  );
}
