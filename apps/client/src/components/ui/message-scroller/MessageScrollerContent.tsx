import { MessageScroller as MessageScrollerPrimitive } from '@shadcn/react/message-scroller';
import { cn } from 'cn';
import type { MessageScrollerContentProps } from './types';

/** Arranges messages inside the scrolling viewport. */
export function MessageScrollerContent({ className, ...props }: MessageScrollerContentProps) {
  return (
    <MessageScrollerPrimitive.Content
      data-slot="message-scroller-content"
      className={cn('flex h-max min-h-full flex-col gap-6', className)}
      {...props}
    />
  );
}
