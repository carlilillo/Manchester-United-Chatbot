'use client';

import { Toggle as TogglePrimitive } from '@base-ui/react/toggle';
import { cn } from 'cn';
import { toggleVariants } from './toggle-variants';
import type { ToggleProps } from './types';

/** Provides a styled button with an accessible pressed state. */
export function Toggle({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: ToggleProps) {
  return (
    <TogglePrimitive
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  );
}
