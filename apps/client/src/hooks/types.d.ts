import type { loadHighlighter } from '@/lib/highlighter';
import type { ReactNode } from 'react';

/** Shared state exposed by the sidebar provider. */
export type SidebarContextProps = {
  state: 'expanded' | 'collapsed';
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
};

/** Lifecycle of the anonymous visitor session. */
export type SessionStatus = 'loading' | 'ready' | 'error';

/** A loaded grammar may be absent when the language is unsupported. */
export type CodeHighlighter = Awaited<ReturnType<typeof loadHighlighter>>;

export interface LoadedHighlighter {
  language: string;
  highlighter: CodeHighlighter;
}

/** Completed code lines and the grammar state needed to continue streaming. */
export interface HighlightedCodeState {
  highlighter: CodeHighlighter;
  text: string;
  lines: ReactNode[];
  state?: Parameters<NonNullable<CodeHighlighter>['highlight']>[1];
}
