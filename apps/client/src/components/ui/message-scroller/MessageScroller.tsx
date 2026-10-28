import { MessageScroller as MessageScrollerPrimitive } from '@shadcn/react/message-scroller';
import { cn } from 'cn';
import type { MessageScrollerProps } from './types';

/** Contains the viewport and jump-to-message controls. */
export function MessageScroller({ className, ...props }: MessageScrollerProps) {
  return (
    <MessageScrollerPrimitive.Root
      data-slot="message-scroller"
      className={cn(
        'group/message-scroller relative flex size-full min-h-0 flex-col overflow-hidden',
        className,
      )}
      {...props}
    />
  );
}
