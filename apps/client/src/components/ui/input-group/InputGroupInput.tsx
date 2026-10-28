import { Input } from '@/components/ui/input';
import { cn } from 'cn';
import type { InputGroupInputProps } from './types';

/** Integrates a single-line input with its surrounding group surface. */
export function InputGroupInput({ className, ...props }: InputGroupInputProps) {
  return (
    <Input
      data-slot="input-group-control"
      className={cn(
        'flex-1 rounded-none border-0 bg-transparent shadow-none ring-0 focus-visible:ring-0 disabled:bg-transparent aria-invalid:ring-0 dark:bg-transparent dark:disabled:bg-transparent',
        className,
      )}
      {...props}
    />
  );
}
