import { CollapsibleTrigger } from '@/components/ui/collapsible/CollapsibleTrigger';
import { cn } from 'cn';
import { ChevronRightIcon } from 'lucide-react';
import { TraceIcon } from './TraceIcon';
import type { TraceCollapsibleTriggerProps } from './types';

/** Toggles activity details and shows their expansion indicator. */
export function TraceCollapsibleTrigger({
  className,
  children,
  ...props
}: TraceCollapsibleTriggerProps) {
  return (
    <CollapsibleTrigger
      data-slot="trace-collapsible-trigger"
      className={cn(
        'group/trace-collapsible-trigger flex w-fit max-w-full min-w-0 cursor-pointer items-center gap-1 rounded-md text-left text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 has-[[data-status=error]]:text-destructive',
        className,
      )}
      {...props}
    >
      {children}
      <TraceIcon className="transition-transform group-aria-expanded/trace-collapsible-trigger:rotate-90">
        <ChevronRightIcon />
      </TraceIcon>
    </CollapsibleTrigger>
  );
}
