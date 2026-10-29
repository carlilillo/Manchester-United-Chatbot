import { Button } from '@/components/ui/button';
import { Empty } from '@/components/ui/empty/Empty';
import { EmptyContent } from '@/components/ui/empty/EmptyContent';
import { EmptyDescription } from '@/components/ui/empty/EmptyDescription';
import { EmptyHeader } from '@/components/ui/empty/EmptyHeader';
import { EmptyTitle } from '@/components/ui/empty/EmptyTitle';
import type { WorkspaceErrorProps } from './types';

/** Explains that the session could not start and offers a retry. */
export function WorkspaceError({ onRetry }: WorkspaceErrorProps) {
  return (
    <Empty role="alert">
      <EmptyHeader>
        <EmptyTitle className="text-2xl font-semibold">Could not load your workspace</EmptyTitle>
        <EmptyDescription>Check your connection, then try again.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={onRetry}>Try again</Button>
      </EmptyContent>
    </Empty>
  );
}
