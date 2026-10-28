import { cn } from 'cn';
import type { MessageGroupProps } from './types';

/** Groups related message rows with consistent spacing. */
export function MessageGroup({ className, ...props }: MessageGroupProps) {
  return (
    <div
      data-slot="message-group"
      className={cn('flex min-w-0 flex-col gap-2', className)}
      {...props}
    />
  );
}
