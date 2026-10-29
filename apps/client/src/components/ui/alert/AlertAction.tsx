import { cn } from 'cn';
import type { AlertActionProps } from './types';

/** Pins a compact action, such as dismiss, to the alert's corner. */
export function AlertAction({ className, ...props }: AlertActionProps) {
  return (
    <div data-slot="alert-action" className={cn('absolute top-2 right-2', className)} {...props} />
  );
}
