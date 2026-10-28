import { cn } from 'cn';
import type { BubbleGroupProps } from './types';

/** Groups adjacent message bubbles from the same author. */
export function BubbleGroup({ className, ...props }: BubbleGroupProps) {
  return (
    <div
      data-slot="bubble-group"
      className={cn('flex min-w-0 flex-col gap-2', className)}
      {...props}
    />
  );
}
