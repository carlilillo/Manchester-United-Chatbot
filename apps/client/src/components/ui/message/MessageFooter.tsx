import { cn } from 'cn';
import type { MessageFooterProps } from './types';

/** Arranges actions and supporting details beneath a message. */
export function MessageFooter({ className, ...props }: MessageFooterProps) {
  return (
    <div
      data-slot="message-footer"
      className={cn(
        'flex max-w-full min-w-0 items-center px-3 text-xs font-medium text-muted-foreground group-has-data-[variant=ghost]/message:px-0 group-data-[align=end]/message:justify-end',
        className,
      )}
      {...props}
    />
  );
}
