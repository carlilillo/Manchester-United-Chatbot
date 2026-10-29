import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar/SidebarTrigger';
import type { AppHeaderProps } from './types';

/** Holds the sidebar control and, inside a conversation, its title. */
export function AppHeader({ title }: AppHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b px-3 sm:px-4">
      <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
      {title && (
        <>
          <Separator orientation="vertical" className="my-4" />
          <h1 className="min-w-0 truncate text-sm font-medium">{title}</h1>
        </>
      )}
    </header>
  );
}
