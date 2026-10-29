import type { ExtraProps } from 'react-markdown';
import type * as React from 'react';

/** Props for SourceLink. */
export type SourceLinkProps = React.ComponentProps<'a'> & ExtraProps;

/** Props for MarkdownTable. */
export type MarkdownTableProps = React.ComponentProps<'table'> & ExtraProps;

/** Props for MessageMarkdown. */
export type MessageMarkdownProps = { content: string };
