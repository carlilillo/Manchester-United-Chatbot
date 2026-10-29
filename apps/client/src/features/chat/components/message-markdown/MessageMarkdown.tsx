import ReactMarkdown from 'react-markdown';
import { markdownComponents, markdownPlugins } from './config';
import type { MessageMarkdownProps } from './types';

/** Renders answer Markdown with GFM support and the default safe URL handling. */
export function MessageMarkdown({ content }: MessageMarkdownProps) {
  return (
    <div className="message-markdown">
      <ReactMarkdown remarkPlugins={markdownPlugins} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
