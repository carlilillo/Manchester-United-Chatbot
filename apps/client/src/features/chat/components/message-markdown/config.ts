import { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SourceLink } from './SourceLink';

export const markdownComponents: Components = { a: SourceLink };

export const markdownPlugins = [remarkGfm];
