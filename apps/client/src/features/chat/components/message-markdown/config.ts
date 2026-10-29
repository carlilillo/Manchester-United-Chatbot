import { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MarkdownTable } from './MarkdownTable';
import { SourceLink } from './SourceLink';

/** Element overrides; everything else renders as plain HTML styled by `.message-markdown`. */
export const markdownComponents: Components = { a: SourceLink, table: MarkdownTable };

export const markdownPlugins = [remarkGfm];
