import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';
import type { TooltipProviderProps } from './types';

/** Shares tooltip timing across descendant controls. */
export function TooltipProvider({ delay = 0, ...props }: TooltipProviderProps) {
  return <TooltipPrimitive.Provider data-slot="tooltip-provider" delay={delay} {...props} />;
}
