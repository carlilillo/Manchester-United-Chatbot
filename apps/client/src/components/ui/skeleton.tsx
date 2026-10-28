import { cn } from 'cn';
import type { SkeletonProps } from './types';

/** Reserves content space while data is loading. */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      data-slot="skeleton"
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  );
}
