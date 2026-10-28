import { CollapsibleContent } from '@/components/ui/collapsible/CollapsibleContent';
import { cn } from 'cn';
import type { TraceCollapsibleContentProps } from './types';

/** Reveals nested activity details with a consistent guide line. */
export function TraceCollapsibleContent({
  className,
  children,
  ...props
}: TraceCollapsibleContentProps) {
  return (
    <CollapsibleContent
      data-slot="trace-collapsible-content"
      className="h-(--collapsible-panel-height) min-w-0 overflow-hidden transition-[height] duration-200 data-ending-style:h-0 data-starting-style:h-0"
      {...props}
    >
      <div
        data-slot="trace-collapsible-content-inner"
        className={cn(
          'mt-2 mb-1 ml-[calc(--spacing(2)-1px)] min-w-0 border-l pr-1 pl-4 leading-relaxed wrap-break-word text-muted-foreground',
          className,
        )}
      >
        {children}
      </div>
    </CollapsibleContent>
  );
}
