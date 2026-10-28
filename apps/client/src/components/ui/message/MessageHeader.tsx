import { cn } from 'cn';
import type { MessageHeaderProps } from './types';

/** Arranges author and timestamp information above a message. */
export function MessageHeader({ className, ...props }: MessageHeaderProps) {
  return (
    <div
      data-slot="message-header"
      className={cn(
        'flex max-w-full min-w-0 items-center px-3 text-xs font-medium text-muted-foreground group-has-data-[variant=ghost]/message:px-0',
        className,
      )}
      {...props}
    />
  );
}
