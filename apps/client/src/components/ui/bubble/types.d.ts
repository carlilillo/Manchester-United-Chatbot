import type { bubbleVariants } from './variants';
import type { useRender } from '@base-ui/react/use-render';
import type { VariantProps } from 'class-variance-authority';
import type * as React from 'react';

/** Props for BubbleGroup. */
export type BubbleGroupProps = React.ComponentProps<'div'>;

/** Props for Bubble. */
export type BubbleProps = React.ComponentProps<'div'> &
  VariantProps<typeof bubbleVariants> & {
    align?: 'start' | 'end';
  };

/** Props for BubbleContent. */
export type BubbleContentProps = useRender.ComponentProps<'div'>;

/** Props for BubbleReactions. */
export type BubbleReactionsProps = React.ComponentProps<'div'> & {
  align?: 'start' | 'end';
  side?: 'top' | 'bottom';
};
