import { Dialog as SheetPrimitive } from '@base-ui/react/dialog';
import type { SheetCloseProps } from './types';

/** Closes the active sheet and restores focus to its trigger. */
export function SheetClose({ ...props }: SheetCloseProps) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}
