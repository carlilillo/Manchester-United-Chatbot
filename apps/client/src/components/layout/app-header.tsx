import { SidebarTrigger } from '@/components/ui/sidebar/SidebarTrigger';
import { Menu } from 'lucide-react';
import type { AppHeaderProps } from './types';

/** Shows the active screen title and the responsive sidebar control. */
export function AppHeader({ title }: AppHeaderProps) {
  return (
    <header className="topbar">
      <SidebarTrigger aria-label="Toggle sidebar">
        <Menu />
      </SidebarTrigger>
      <div className="topbar-divider" />
      <span className="topbar-title">{title}</span>
      <div className="topbar-right">
        <span className="topbar-edition">EST. 1878 · BUILT FOR THE FANS</span>
        <div className="topbar-dot" />
      </div>
    </header>
  );
}
