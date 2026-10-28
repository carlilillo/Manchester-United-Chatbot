import { cn } from 'cn';
import { codeBlockVariants } from './variants';
import type { CodeBlockProps } from './types';

/** Provides the visual container for a code sample. */
export function CodeBlock({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: CodeBlockProps) {
  return (
    <div
      data-slot="code-block"
      data-variant={variant}
      data-size={size}
      className={cn(codeBlockVariants({ variant }), className)}
      {...props}
    />
  );
}
