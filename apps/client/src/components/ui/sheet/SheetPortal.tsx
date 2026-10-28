import { Dialog as SheetPrimitive } from '@base-ui/react/dialog';
import type { SheetPortalProps } from './types';

/** Mounts sheet content outside the surrounding layout. */
export function SheetPortal({ ...props }: SheetPortalProps) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
}
