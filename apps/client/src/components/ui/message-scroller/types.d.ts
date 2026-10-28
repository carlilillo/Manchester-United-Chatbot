import type { Button } from '@/components/ui/button';
import type { MessageScroller as MessageScrollerPrimitive } from '@shadcn/react/message-scroller';
import type * as React from 'react';

/** Props for MessageScrollerProvider. */
export type MessageScrollerProviderProps = React.ComponentProps<
  typeof MessageScrollerPrimitive.Provider
>;

/** Props for MessageScroller. */
export type MessageScrollerProps = React.ComponentProps<typeof MessageScrollerPrimitive.Root>;

/** Props for MessageScrollerViewport. */
export type MessageScrollerViewportProps = React.ComponentProps<
  typeof MessageScrollerPrimitive.Viewport
>;

/** Props for MessageScrollerContent. */
export type MessageScrollerContentProps = React.ComponentProps<
  typeof MessageScrollerPrimitive.Content
>;

/** Props for MessageScrollerItem. */
export type MessageScrollerItemProps = React.ComponentProps<typeof MessageScrollerPrimitive.Item>;

/** Props for MessageScrollerButton. */
export type MessageScrollerButtonProps = React.ComponentProps<
  typeof MessageScrollerPrimitive.Button
> &
  Pick<React.ComponentProps<typeof Button>, 'variant' | 'size'>;
