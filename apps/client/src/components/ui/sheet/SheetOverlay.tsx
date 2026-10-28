import { Dialog as SheetPrimitive } from '@base-ui/react/dialog';
import { cn } from 'cn';
import type { SheetOverlayProps } from './types';

/** Provides the backdrop behind an open sheet. */
export function SheetOverlay({ className, ...props }: SheetOverlayProps) {
  return (
    <SheetPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        'fixed inset-0 z-50 bg-black/10 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs',
        className,
      )}
      {...props}
    />
  );
}
