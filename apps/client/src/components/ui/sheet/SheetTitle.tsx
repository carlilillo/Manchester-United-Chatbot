import { Dialog as SheetPrimitive } from '@base-ui/react/dialog';
import { cn } from 'cn';
import type { SheetTitleProps } from './types';

/** Gives the sheet its accessible name. */
export function SheetTitle({ className, ...props }: SheetTitleProps) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn('font-heading text-base font-medium text-foreground', className)}
      {...props}
    />
  );
}
