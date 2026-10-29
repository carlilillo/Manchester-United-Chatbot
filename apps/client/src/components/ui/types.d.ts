import type { badgeVariants } from './badge-variants';
import type { buttonVariants } from './button-variants';
import type { toggleVariants } from './toggle-variants';
import type { Button as ButtonPrimitive } from '@base-ui/react/button';
import type { Separator as SeparatorPrimitive } from '@base-ui/react/separator';
import type { Switch as SwitchPrimitive } from '@base-ui/react/switch';
import type { Toggle as TogglePrimitive } from '@base-ui/react/toggle';
import type { useRender } from '@base-ui/react/use-render';
import type { VariantProps } from 'class-variance-authority';
import type * as React from 'react';

/** Props for Badge. */
export type BadgeProps = useRender.ComponentProps<'span'> & VariantProps<typeof badgeVariants>;

/** Props for Button. */
export type ButtonProps = ButtonPrimitive.Props & VariantProps<typeof buttonVariants>;

/** Props for Input. */
export type InputProps = React.ComponentProps<'input'>;

/** Props for Label. */
export type LabelProps = React.ComponentProps<'label'>;

/** Props for Separator. */
export type SeparatorProps = SeparatorPrimitive.Props;

/** Props for Skeleton. */
export type SkeletonProps = React.ComponentProps<'div'>;

/** Props for Switch. */
export type SwitchProps = SwitchPrimitive.Root.Props & {
  size?: 'sm' | 'default';
};

/** Props for Textarea. */
export type TextareaProps = React.ComponentProps<'textarea'>;

/** Props for Toggle. */
export type ToggleProps = TogglePrimitive.Props & VariantProps<typeof toggleVariants>;
