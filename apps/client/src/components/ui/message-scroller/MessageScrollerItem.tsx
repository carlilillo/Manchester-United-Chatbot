import { MessageScroller as MessageScrollerPrimitive } from '@shadcn/react/message-scroller';
import { cn } from 'cn';
import type { MessageScrollerItemProps } from './types';

/** Registers one message and its optional scroll anchor. */
export function MessageScrollerItem({
  className,
  scrollAnchor = false,
  ...props
}: MessageScrollerItemProps) {
  return (
    <MessageScrollerPrimitive.Item
      data-slot="message-scroller-item"
      scrollAnchor={scrollAnchor}
      className={cn(
        'min-w-0 shrink-0 [contain-intrinsic-size:auto_10rem] [content-visibility:auto]',
        className,
      )}
      {...props}
    />
  );
}
