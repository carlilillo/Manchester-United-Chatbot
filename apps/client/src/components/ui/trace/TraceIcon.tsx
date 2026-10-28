import { cn } from 'cn';
import type { TraceIconProps } from './types';

/** Aligns a decorative icon beside an activity row. */
export function TraceIcon({ className, ...props }: TraceIconProps) {
  return (
    <span
      data-slot="trace-icon"
      aria-hidden="true"
      className={cn(
        "flex size-4 shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [[data-slot=trace-title]~&]:-ml-1",
        className,
      )}
      {...props}
    />
  );
}
