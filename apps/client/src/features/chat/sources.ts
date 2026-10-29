import type { ChatMessage } from '@united/contracts';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import type { MarkdownNode, MessageSource } from './types';

/** Parses answers exactly as react-markdown does, so code and images are never mistaken for links. */
const parser = unified().use(remarkParse).use(remarkGfm);

/** Only web pages are listed; other schemes (mailto:, javascript:) are not sources. */
function isWebUrl(url: string) {
  try {
    const { protocol } = new URL(url);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

/** Hostname shown beside a source title, without the `www.` prefix. */
export function sourceHost(url: string) {
  return new URL(url).hostname.replace(/^www\./, '');
}

/** Readable name for a link; falls back to the hostname when the text is empty or the URL itself. */
export function sourceTitle(url: string, text?: string) {
  const title = text?.trim();
  return title && title !== url ? title : sourceHost(url);
}

function textOf(node: MarkdownNode): string {
  return node.value ?? node.children?.map(textOf).join('') ?? '';
}

/** Collects inline and autolinked URLs from answer Markdown, in reading order. */
export function linksFromMarkdown(content: string): MessageSource[] {
  const links: MessageSource[] = [];
  const visit = (node: MarkdownNode) => {
    if (node.type === 'link' && node.url) links.push({ url: node.url, title: textOf(node) });
    node.children?.forEach(visit);
  };
  visit(parser.parse(content) as MarkdownNode);
  return links;
}

/**
 * Sources for one answer. Structured `message.sources` from the API win when
 * present; otherwise the links cited in the answer are used. The agent may cite
 * a page more than once, so sources are deduplicated by URL, keeping the first.
 */
export function collectSources(message: Pick<ChatMessage, 'content' | 'sources'>) {
  const candidates = message.sources?.length ? message.sources : linksFromMarkdown(message.content);
  const seen = new Set<string>();

  return candidates.flatMap((source) => {
    if (!isWebUrl(source.url) || seen.has(source.url)) return [];
    seen.add(source.url);
    return [{ url: source.url, title: sourceTitle(source.url, source.title) }];
  });
}
