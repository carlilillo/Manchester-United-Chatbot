import { cn } from 'cn';
import type { TraceProps } from './types';

/** Groups visible assistant activity steps. */
export function Trace({ className, ...props }: TraceProps) {
  return (
    <div
      data-slot="trace"
      className={cn(
        'flex w-full min-w-0 flex-col gap-2 *:has-[>[data-slot=trace-line]]:flex *:has-[>[data-slot=trace-line]]:w-fit *:has-[>[data-slot=trace-line]]:max-w-full *:has-[>[data-slot=trace-line]]:min-w-0 *:has-[>[data-slot=trace-line]]:rounded-md *:has-[>[data-slot=trace-line]]:text-left *:has-[>[data-slot=trace-line]]:outline-none *:has-[>[data-slot=trace-line]]:focus-visible:ring-3 *:has-[>[data-slot=trace-line]]:focus-visible:ring-ring/50',
        className,
      )}
      {...props}
    />
  );
}
