import { cn } from 'cn';
import type { SheetFooterProps } from './types';

/** Arranges actions at the bottom of a sheet. */
export function SheetFooter({ className, ...props }: SheetFooterProps) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn('mt-auto flex flex-col gap-2 p-4', className)}
      {...props}
    />
  );
}
