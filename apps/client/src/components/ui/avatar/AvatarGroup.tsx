import { cn } from 'cn';
import type { AvatarGroupProps } from './types';

/** Arranges overlapping avatars as one visual group. */
export function AvatarGroup({ className, ...props }: AvatarGroupProps) {
  return (
    <div
      data-slot="avatar-group"
      className={cn(
        'group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background',
        className,
      )}
      {...props}
    />
  );
}
