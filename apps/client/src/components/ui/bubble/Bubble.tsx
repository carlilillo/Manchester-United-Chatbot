import { cn } from 'cn';
import { bubbleVariants } from './variants';
import type { BubbleProps } from './types';

/** Defines the alignment and visual variant of a message bubble. */
export function Bubble({ variant = 'default', align = 'start', className, ...props }: BubbleProps) {
  return (
    <div
      data-slot="bubble"
      data-variant={variant}
      data-align={align}
      className={cn(bubbleVariants({ variant }), className)}
      {...props}
    />
  );
}
