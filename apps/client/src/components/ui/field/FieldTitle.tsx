import { cn } from 'cn';
import type { FieldTitleProps } from './types';

/** Names a field whose control is labelled by other means, such as a group. */
export function FieldTitle({ className, ...props }: FieldTitleProps) {
  return (
    <div
      data-slot="field-label"
      className={cn(
        'flex w-fit items-center gap-2 text-sm font-medium group-data-[disabled=true]/field:opacity-50',
        className,
      )}
      {...props}
    />
  );
}
