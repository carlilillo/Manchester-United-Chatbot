import { APP_NAME } from '@/lib/site';
import { cn } from 'cn';
import type { ChatDisclaimerProps } from './types';

/** States the project's independence beneath the composer. */
export function ChatDisclaimer({ className }: ChatDisclaimerProps) {
  return (
    <p className={cn('px-4 pt-2.5 pb-3 text-center text-xs text-muted-foreground/70', className)}>
      {APP_NAME} is an independent fan project. Check official sources for the latest information.
    </p>
  );
}
