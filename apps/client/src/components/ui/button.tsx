import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cn } from 'cn';
import { buttonVariants } from './button-variants';
import type { ButtonProps } from './types';

/** Applies shared button variants while preserving Base UI interactions. */
export function Button({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
