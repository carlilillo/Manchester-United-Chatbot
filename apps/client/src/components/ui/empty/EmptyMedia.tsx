import { cn } from 'cn';
import { emptyMediaVariants } from './variants';
import type { EmptyMediaProps } from './types';

/** Displays an icon or illustration above an empty state. */
export function EmptyMedia({ className, variant = 'default', ...props }: EmptyMediaProps) {
  return (
    <div
      data-slot="empty-icon"
      data-variant={variant}
      className={cn(emptyMediaVariants({ variant, className }))}
      {...props}
    />
  );
}
