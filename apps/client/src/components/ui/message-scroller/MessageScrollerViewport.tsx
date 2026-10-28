import { MessageScroller as MessageScrollerPrimitive } from '@shadcn/react/message-scroller';
import { cn } from 'cn';
import type { MessageScrollerViewportProps } from './types';

/** Provides the scrollable transcript viewport. */
export function MessageScrollerViewport({ className, ...props }: MessageScrollerViewportProps) {
  return (
    <MessageScrollerPrimitive.Viewport
      data-slot="message-scroller-viewport"
      className={cn(
        'size-full min-h-0 min-w-0 scroll-fade-b scrollbar-thin scrollbar-gutter-stable overflow-y-auto overscroll-contain contain-content data-autoscrolling:scrollbar-thumb-transparent data-autoscrolling:scrollbar-track-transparent data-pending-scroll:invisible',
        className,
      )}
      {...props}
    />
  );
}
