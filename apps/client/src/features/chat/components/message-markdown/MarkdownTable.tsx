import type { MarkdownTableProps } from './types';

/**
 * Frames a table with breathing room and lets wide tables scroll inside the
 * frame, so the page never scrolls horizontally. The frame is focusable so
 * keyboard users can scroll it too.
 */
export function MarkdownTable({ node: _node, ...props }: MarkdownTableProps) {
  return (
    <div data-slot="markdown-table" role="region" aria-label="Table" tabIndex={0}>
      <table {...props} />
    </div>
  );
}
