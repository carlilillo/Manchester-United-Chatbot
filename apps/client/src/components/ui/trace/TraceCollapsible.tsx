import { Collapsible } from '@/components/ui/collapsible/Collapsible';
import { cn } from 'cn';
import type { TraceCollapsibleProps } from './types';

/** Shares expanded state for a group of activity details. */
export function TraceCollapsible({ className, ...props }: TraceCollapsibleProps) {
  return (
    <Collapsible
      data-slot="trace-collapsible"
      className={cn('flex w-full min-w-0 flex-col', className)}
      {...props}
    />
  );
}
