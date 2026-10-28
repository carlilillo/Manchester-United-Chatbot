import { Collapsible as CollapsiblePrimitive } from '@base-ui/react/collapsible';
import type { CollapsibleTriggerProps } from './types';

/** Toggles its associated region with keyboard support. */
export function CollapsibleTrigger({ ...props }: CollapsibleTriggerProps) {
  return <CollapsiblePrimitive.Trigger data-slot="collapsible-trigger" {...props} />;
}
