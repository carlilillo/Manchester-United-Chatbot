import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';
import type { TooltipTriggerProps } from './types';

/** Associates a focusable control with its tooltip. */
export function TooltipTrigger({ ...props }: TooltipTriggerProps) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}
