import { Dialog as SheetPrimitive } from '@base-ui/react/dialog';
import type { SheetTriggerProps } from './types';

/** Opens its associated sheet through an accessible trigger. */
export function SheetTrigger({ ...props }: SheetTriggerProps) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}
