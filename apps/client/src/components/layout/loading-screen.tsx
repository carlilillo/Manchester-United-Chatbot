import { Skeleton } from '@/components/ui/skeleton';

/** Announces loading while reserving space for the next screen. */
export function LoadingScreen() {
  return (
    <div className="loading-screen" role="status">
      <span className="sr-only">Loading…</span>
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-5 w-64 max-w-full" />
    </div>
  );
}
