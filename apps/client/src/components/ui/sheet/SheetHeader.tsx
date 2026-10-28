import { cn } from 'cn';
import type { SheetHeaderProps } from './types';

/** Groups the sheet title and description. */
export function SheetHeader({ className, ...props }: SheetHeaderProps) {
  return (
    <div
      data-slot="sheet-header"
      className={cn('flex flex-col gap-0.5 p-4', className)}
      {...props}
    />
  );
}
