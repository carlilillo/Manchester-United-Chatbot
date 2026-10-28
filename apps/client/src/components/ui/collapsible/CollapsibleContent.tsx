import { Collapsible as CollapsiblePrimitive } from '@base-ui/react/collapsible';
import type { CollapsibleContentProps } from './types';

/** Shows the panel associated with a collapsible trigger. */
export function CollapsibleContent({ ...props }: CollapsibleContentProps) {
  return <CollapsiblePrimitive.Panel data-slot="collapsible-content" {...props} />;
}
