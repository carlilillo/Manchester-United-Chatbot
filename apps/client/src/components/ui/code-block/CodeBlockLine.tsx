import { cn } from 'cn';
import { codeBlockLineVariants } from './variants';
import type { CodeBlockLineProps } from './types';

/** Renders one code line, retaining blank lines when copied. */
export function CodeBlockLine({
  className,
  variant = 'default',
  children,
  ...props
}: CodeBlockLineProps) {
  // An empty line holds a newline so copying a selection keeps blank lines.
  const empty =
    children === undefined ||
    children === null ||
    children === '' ||
    (Array.isArray(children) && children.length === 0);

  return (
    <span
      data-slot="code-block-line"
      data-variant={variant}
      className={cn(codeBlockLineVariants({ variant }), className)}
      {...props}
    >
      <span data-slot="code-block-line-content" className="min-w-0">
        {empty ? '\n' : children}
      </span>
    </span>
  );
}
