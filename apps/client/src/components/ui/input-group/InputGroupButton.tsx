import { Button } from '@/components/ui/button';
import { cn } from 'cn';
import { inputGroupButtonVariants } from './variants';
import type { InputGroupButtonProps } from './types';

/** Sizes an action button to fit inside an input group. */
export function InputGroupButton({
  className,
  type = 'button',
  variant = 'ghost',
  size = 'xs',
  ...props
}: InputGroupButtonProps) {
  return (
    <Button
      type={type}
      data-slot="input-group-button"
      data-size={size}
      variant={variant}
      className={cn(inputGroupButtonVariants({ size }), className)}
      {...props}
    />
  );
}
