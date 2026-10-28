import { cn } from 'cn';
import { inputGroupAddonVariants } from './variants';
import type { InputGroupAddonProps } from './types';

/** Positions an adornment and forwards background clicks to its input. */
export function InputGroupAddon({
  className,
  align = 'inline-start',
  ...props
}: InputGroupAddonProps) {
  return (
    <div
      role="group"
      data-slot="input-group-addon"
      data-align={align}
      className={cn(inputGroupAddonVariants({ align }), className)}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) {
          return;
        }
        e.currentTarget.parentElement?.querySelector('input')?.focus();
      }}
      {...props}
    />
  );
}
