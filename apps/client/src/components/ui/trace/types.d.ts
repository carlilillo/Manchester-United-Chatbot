import type { Collapsible } from '@/components/ui/collapsible/Collapsible';
import type { CollapsibleContent } from '@/components/ui/collapsible/CollapsibleContent';
import type { CollapsibleTrigger } from '@/components/ui/collapsible/CollapsibleTrigger';
import type * as React from 'react';

/** Props for Trace. */
export type TraceProps = React.ComponentProps<'div'>;

/** Props for TraceLine. */
export type TraceLineProps = React.ComponentProps<'span'> & {
  status?: 'running' | 'error' | 'pending';
};

/** Props for TraceIcon. */
export type TraceIconProps = React.ComponentProps<'span'>;

/** Props for TraceTitle. */
export type TraceTitleProps = React.ComponentProps<'span'>;

/** Props for TraceDescription. */
export type TraceDescriptionProps = React.ComponentProps<'span'>;

/** Props for TraceCollapsible. */
export type TraceCollapsibleProps = Omit<React.ComponentProps<typeof Collapsible>, 'open'> &
  (
    | { open?: undefined }
    | {
        open: boolean;
        onOpenChange: NonNullable<React.ComponentProps<typeof Collapsible>['onOpenChange']>;
      }
  );

/** Props for TraceCollapsibleTrigger. */
export type TraceCollapsibleTriggerProps = React.ComponentProps<typeof CollapsibleTrigger>;

/** Props for TraceCollapsibleContent. */
export type TraceCollapsibleContentProps = React.ComponentProps<typeof CollapsibleContent>;
