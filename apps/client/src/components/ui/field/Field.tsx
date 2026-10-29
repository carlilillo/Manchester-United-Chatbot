import { cn } from 'cn';
import { fieldVariants } from './variants';
import type { FieldProps } from './types';

/** Lays out one control with its label, description, and validation state. */
export function Field({ className, orientation = 'vertical', ...props }: FieldProps) {
  return (
    <div
      role="group"
      data-slot="field"
      data-orientation={orientation}
      className={cn(fieldVariants({ orientation }), className)}
      {...props}
    />
  );
}
