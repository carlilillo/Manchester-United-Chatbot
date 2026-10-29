import { cn } from 'cn';
import type { FieldContentProps } from './types';

/** Stacks a label and description beside a horizontal control. */
export function FieldContent({ className, ...props }: FieldContentProps) {
  return (
    <div
      data-slot="field-content"
      className={cn('group/field-content flex flex-1 flex-col gap-0.5 leading-snug', className)}
      {...props}
    />
  );
}
