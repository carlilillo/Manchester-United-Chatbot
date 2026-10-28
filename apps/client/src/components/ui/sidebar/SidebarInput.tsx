import { Input } from '@/components/ui/input';
import { cn } from 'cn';
import type { SidebarInputProps } from './types';

/** Sizes a search input for use within sidebar navigation. */
export function SidebarInput({ className, ...props }: SidebarInputProps) {
  return (
    <Input
      data-slot="sidebar-input"
      data-sidebar="input"
      className={cn('h-8 w-full bg-background shadow-none', className)}
      {...props}
    />
  );
}
