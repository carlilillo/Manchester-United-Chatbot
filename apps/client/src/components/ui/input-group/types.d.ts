import type { Button } from '@/components/ui/button';
import type { inputGroupAddonVariants, inputGroupButtonVariants } from './variants';
import type { VariantProps } from 'class-variance-authority';
import type * as React from 'react';

/** Props for InputGroup. */
export type InputGroupProps = React.ComponentProps<'div'>;

/** Props for InputGroupAddon. */
export type InputGroupAddonProps = React.ComponentProps<'div'> &
  VariantProps<typeof inputGroupAddonVariants>;

/** Props for InputGroupButton. */
export type InputGroupButtonProps = Omit<React.ComponentProps<typeof Button>, 'size' | 'type'> &
  VariantProps<typeof inputGroupButtonVariants> & {
    type?: 'button' | 'submit' | 'reset';
  };

/** Props for InputGroupText. */
export type InputGroupTextProps = React.ComponentProps<'span'>;

/** Props for InputGroupInput. */
export type InputGroupInputProps = React.ComponentProps<'input'>;

/** Props for InputGroupTextarea. */
export type InputGroupTextareaProps = React.ComponentProps<'textarea'>;
