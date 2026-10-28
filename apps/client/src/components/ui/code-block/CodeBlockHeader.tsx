import { cn } from 'cn';
import type { CodeBlockHeaderProps } from './types';

/** Arranges a code sample title and optional actions. */
export function CodeBlockHeader({ className, ...props }: CodeBlockHeaderProps) {
  return (
    <div
      data-slot="code-block-header"
      className={cn(
        'flex min-w-0 shrink-0 items-center gap-2 px-3 pt-3 text-muted-foreground group-data-[size=sm]/code-block:px-2.5 group-data-[size=sm]/code-block:pt-2.5 group-data-[variant=destructive]/code-block:text-destructive *:has-[>[data-slot=code-block-title]]:min-w-0',
        className,
      )}
      {...props}
    />
  );
}
