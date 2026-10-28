import { cn } from 'cn';
import type { InputGroupTextProps } from './types';

/** Styles supporting text within an input group. */
export function InputGroupText({ className, ...props }: InputGroupTextProps) {
  return (
    <span
      className={cn(
        "flex items-center gap-2 text-sm text-muted-foreground [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}
