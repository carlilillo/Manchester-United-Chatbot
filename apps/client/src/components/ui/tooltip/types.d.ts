import type { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';

/** Props for TooltipProvider. */
export type TooltipProviderProps = TooltipPrimitive.Provider.Props;

/** Props for Tooltip. */
export type TooltipProps = TooltipPrimitive.Root.Props;

/** Props for TooltipTrigger. */
export type TooltipTriggerProps = TooltipPrimitive.Trigger.Props;

/** Props for TooltipContent. */
export type TooltipContentProps = TooltipPrimitive.Popup.Props &
  Pick<TooltipPrimitive.Positioner.Props, 'align' | 'alignOffset' | 'side' | 'sideOffset'>;
