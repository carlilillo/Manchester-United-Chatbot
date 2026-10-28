import * as React from 'react';
import type { SidebarContextProps } from './types';

export const SidebarContext = React.createContext<SidebarContextProps | null>(null);

/** Reads shared navigation state and catches missing providers early. */
export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider.');
  }

  return context;
}
