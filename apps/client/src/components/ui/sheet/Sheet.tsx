import { Dialog as SheetPrimitive } from '@base-ui/react/dialog';
import type { SheetProps } from './types';

/** Shares open state and focus management for an overlay panel. */
export function Sheet({ ...props }: SheetProps) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}
