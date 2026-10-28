import { Avatar as AvatarPrimitive } from '@base-ui/react/avatar';
import { cn } from 'cn';
import type { AvatarImageProps } from './types';

/** Displays the loaded avatar image through the accessible image primitive. */
export function AvatarImage({ className, ...props }: AvatarImageProps) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn('aspect-square size-full rounded-full object-cover', className)}
      {...props}
    />
  );
}
