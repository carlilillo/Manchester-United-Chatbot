import { Avatar as AvatarPrimitive } from '@base-ui/react/avatar';
import { cn } from 'cn';
import type { AvatarFallbackProps } from './types';

/** Provides a readable fallback when an avatar image cannot load. */
export function AvatarFallback({ className, ...props }: AvatarFallbackProps) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        'flex size-full items-center justify-center rounded-full bg-muted text-sm text-muted-foreground group-data-[size=sm]/avatar:text-xs',
        className,
      )}
      {...props}
    />
  );
}
