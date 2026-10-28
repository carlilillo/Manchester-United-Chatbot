import { cn } from 'cn';
import type { MessageAvatarProps } from './types';

/** Reserves a compact author marker beside a message. */
export function MessageAvatar({ className, ...props }: MessageAvatarProps) {
  return (
    <div
      data-slot="message-avatar"
      className={cn(
        'flex w-fit min-w-8 shrink-0 items-center justify-center self-end overflow-hidden rounded-full bg-muted group-has-data-[slot=message-footer]/message:-translate-y-8',
        className,
      )}
      {...props}
    />
  );
}
