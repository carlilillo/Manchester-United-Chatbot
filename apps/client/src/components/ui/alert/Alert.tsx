import { cn } from 'cn';
import { alertVariants } from './variants';
import type { AlertProps } from './types';

/** Announces a callout or problem that needs the visitor's attention. */
export function Alert({ className, variant, ...props }: AlertProps) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}
