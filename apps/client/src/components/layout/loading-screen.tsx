import { Skeleton } from '@/components/ui/skeleton';

/** Announces loading while reserving space for the next screen. */
export function LoadingScreen() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3" role="status">
      <span className="sr-only">Loading…</span>
      <Skeleton className="h-8 w-64 max-w-[80%]" />
      <Skeleton className="h-5 w-48 max-w-[60%]" />
    </div>
  );
}
