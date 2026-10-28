import { cn } from 'cn';
import type { EmptyProps } from './types';

/** Groups an empty state and its next available action. */
export function Empty({ className, ...props }: EmptyProps) {
  return (
    <div
      data-slot="empty"
      className={cn(
        'flex w-full min-w-0 flex-1 flex-col items-center justify-center gap-4 rounded-xl border-dashed p-6 text-center text-balance',
        className,
      )}
      {...props}
    />
  );
}
