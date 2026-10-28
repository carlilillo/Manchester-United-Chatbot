import { cn } from 'cn';
import type { TraceLineProps } from './types';

/** Displays one activity row with optional running or error status. */
export function TraceLine({ className, status, ...props }: TraceLineProps) {
  return (
    <span
      data-slot="trace-line"
      data-status={status}
      className={cn(
        'flex w-fit max-w-full min-w-0 items-center gap-2 text-sm text-muted-foreground transition-colors in-[a,button]:cursor-pointer in-[a:hover,button:hover]:text-foreground data-[status=error]:text-destructive data-[status=error]:in-[a:hover,button:hover]:text-destructive data-[status=pending]:opacity-60 data-[status=running]:*:data-[slot=trace-title]:shimmer',
        className,
      )}
      {...props}
    />
  );
}
