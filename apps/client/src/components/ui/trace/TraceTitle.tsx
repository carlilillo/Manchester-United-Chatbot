import { cn } from 'cn';
import type { TraceTitleProps } from './types';

/** Labels an activity row and applies streaming emphasis. */
export function TraceTitle({ className, ...props }: TraceTitleProps) {
  return (
    <span
      data-slot="trace-title"
      className={cn('min-w-0 truncate motion-reduce:shimmer-none', className)}
      {...props}
    />
  );
}
