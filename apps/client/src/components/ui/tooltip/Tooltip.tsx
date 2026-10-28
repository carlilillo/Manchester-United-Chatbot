import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';
import type { TooltipProps } from './types';

/** Coordinates a tooltip trigger and its descriptive content. */
export function Tooltip({ ...props }: TooltipProps) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />;
}
