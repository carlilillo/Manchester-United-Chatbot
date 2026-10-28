import type { Avatar as AvatarPrimitive } from '@base-ui/react/avatar';
import type * as React from 'react';

/** Props for Avatar. */
export type AvatarProps = AvatarPrimitive.Root.Props & {
  size?: 'default' | 'sm' | 'lg';
};

/** Props for AvatarImage. */
export type AvatarImageProps = AvatarPrimitive.Image.Props;

/** Props for AvatarFallback. */
export type AvatarFallbackProps = AvatarPrimitive.Fallback.Props;

/** Props for AvatarBadge. */
export type AvatarBadgeProps = React.ComponentProps<'span'>;

/** Props for AvatarGroup. */
export type AvatarGroupProps = React.ComponentProps<'div'>;

/** Props for AvatarGroupCount. */
export type AvatarGroupCountProps = React.ComponentProps<'div'>;
