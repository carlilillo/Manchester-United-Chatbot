import { cn } from 'cn';
import { bubbleReactionsVariants } from './variants';
import type { BubbleReactionsProps } from './types';

/** Positions reactions beneath a message bubble. */
export function BubbleReactions({
  side = 'bottom',
  align = 'end',
  className,
  ...props
}: BubbleReactionsProps) {
  return (
    <div
      data-slot="bubble-reactions"
      data-align={align}
      data-side={side}
      className={cn(bubbleReactionsVariants({ side, align }), className)}
      {...props}
    />
  );
}
