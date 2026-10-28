import { cn } from 'cn';
import type { TraceDescriptionProps } from './types';

/** Displays compact supporting information beside an activity title. */
export function TraceDescription({ className, ...props }: TraceDescriptionProps) {
  return (
    <span
      data-slot="trace-description"
      className={cn('shrink-0 text-muted-foreground/70 tabular-nums', className)}
      {...props}
    />
  );
}
