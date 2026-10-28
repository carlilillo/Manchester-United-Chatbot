import { cn } from 'cn';
import type { EmptyTitleProps } from './types';

/** Provides the primary label for an empty state. */
export function EmptyTitle({ className, ...props }: EmptyTitleProps) {
  return (
    <div
      data-slot="empty-title"
      className={cn('font-heading text-sm font-medium tracking-tight', className)}
      {...props}
    />
  );
}
