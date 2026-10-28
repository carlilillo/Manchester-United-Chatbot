import { cn } from 'cn';
import type { EmptyHeaderProps } from './types';

/** Arranges the illustration and explanatory text for an empty state. */
export function EmptyHeader({ className, ...props }: EmptyHeaderProps) {
  return (
    <div
      data-slot="empty-header"
      className={cn('flex max-w-sm flex-col items-center gap-2', className)}
      {...props}
    />
  );
}
