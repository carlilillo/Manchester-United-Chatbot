import { Textarea } from '@/components/ui/textarea';
import { cn } from 'cn';
import type { InputGroupTextareaProps } from './types';

/** Integrates a multiline input with its surrounding group surface. */
export function InputGroupTextarea({ className, ...props }: InputGroupTextareaProps) {
  return (
    <Textarea
      data-slot="input-group-control"
      className={cn(
        'flex-1 resize-none rounded-none border-0 bg-transparent py-2 shadow-none ring-0 focus-visible:ring-0 disabled:bg-transparent aria-invalid:ring-0 dark:bg-transparent dark:disabled:bg-transparent',
        className,
      )}
      {...props}
    />
  );
}
