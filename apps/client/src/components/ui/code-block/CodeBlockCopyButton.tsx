import { Button } from '@/components/ui/button';
import { cn } from 'cn';
import { CheckIcon, CopyIcon } from 'lucide-react';
import * as React from 'react';
import type { CodeBlockCopyButtonProps } from './types';

/** Copies a code sample and briefly announces successful copying. */
export function CodeBlockCopyButton({
  value,
  variant = 'ghost',
  size = 'icon-xs',
  className,
  onClick,
  ...props
}: CodeBlockCopyButtonProps) {
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!copied) {
      return;
    }

    const timeout = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timeout);
  }, [copied]);

  return (
    <>
      <Button
        data-slot="code-block-copy-button"
        data-copied={copied || undefined}
        variant={variant}
        size={size}
        aria-label={copied ? 'Copied' : 'Copy'}
        className={cn(className)}
        onClick={(event) => {
          onClick?.(event);
          navigator.clipboard
            .writeText(value)
            .then(() => setCopied(true))
            .catch(() => {});
        }}
        {...props}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </Button>
      <span aria-live="polite" className="sr-only">
        {copied ? 'Copied' : ''}
      </span>
    </>
  );
}
