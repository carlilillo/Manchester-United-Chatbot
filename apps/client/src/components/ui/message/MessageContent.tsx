import { cn } from 'cn';
import type { MessageContentProps } from './types';

/** Groups the body and supporting metadata of a message. */
export function MessageContent({ className, ...props }: MessageContentProps) {
  return (
    <div
      data-slot="message-content"
      className={cn(
        'flex w-full min-w-0 flex-col gap-2.5 wrap-break-word group-data-[align=end]/message:*:data-slot:self-end',
        className,
      )}
      {...props}
    />
  );
}
