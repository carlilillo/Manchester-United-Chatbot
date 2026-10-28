import { cn } from 'cn';
import type { EmptyDescriptionProps } from './types';

/** Explains why a view is empty and what to do next. */
export function EmptyDescription({ className, ...props }: EmptyDescriptionProps) {
  return (
    <div
      data-slot="empty-description"
      className={cn(
        'text-sm/relaxed text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary',
        className,
      )}
      {...props}
    />
  );
}
