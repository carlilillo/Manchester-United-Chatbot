import { Collapsible as CollapsiblePrimitive } from '@base-ui/react/collapsible';
import type { CollapsibleProps } from './types';

/** Shares the expanded state for a collapsible region. */
export function Collapsible({ ...props }: CollapsibleProps) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />;
}
