import { cn } from 'cn';
import type { CodeBlockFooterProps } from './types';

/** Arranges supporting details below a code sample. */
export function CodeBlockFooter({ className, ...props }: CodeBlockFooterProps) {
  return (
    <div
      data-slot="code-block-footer"
      className={cn(
        'flex min-w-0 shrink-0 items-center gap-2 px-3 pb-3 text-muted-foreground group-data-[size=sm]/code-block:px-2.5 group-data-[size=sm]/code-block:pb-2.5',
        className,
      )}
      {...props}
    />
  );
}
