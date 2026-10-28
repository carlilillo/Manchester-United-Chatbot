import { cn } from 'cn';
import type { MessageProps } from './types';

/** Aligns one conversation row according to its author. */
export function Message({ className, align = 'start', ...props }: MessageProps) {
  return (
    <div
      data-slot="message"
      data-align={align}
      className={cn(
        'group/message relative flex w-full min-w-0 gap-2 text-sm data-[align=end]:flex-row-reverse',
        className,
      )}
      {...props}
    />
  );
}
