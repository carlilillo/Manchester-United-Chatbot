import { Dialog as SheetPrimitive } from '@base-ui/react/dialog';
import { cn } from 'cn';
import type { SheetDescriptionProps } from './types';

/** Associates supporting instructions with the sheet. */
export function SheetDescription({ className, ...props }: SheetDescriptionProps) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}
