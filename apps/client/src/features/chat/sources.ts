import type { ChatMessage } from '@united/contracts';
import type { MessageSource } from './types';

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

/** Readable name for a source; falls back to the hostname when the title is empty or the URL itself. */
export function sourceTitle(url: string, title?: string) {
  const text = title?.trim();
  return text && text !== url ? text : sourceHost(url);
}

/**
 * Sources for one answer. The server records them from the documents the
 * agents read, so they never depend on links printed in the answer text. The
 * list is still guarded here: web pages only, each URL once, every entry named.
 */
export function collectSources(message: Pick<ChatMessage, 'sources'>): MessageSource[] {
  const seen = new Set<string>();

  return (message.sources ?? []).flatMap((source) => {
    if (!isWebUrl(source.url) || seen.has(source.url)) return [];
    seen.add(source.url);
    return [{ url: source.url, title: sourceTitle(source.url, source.title) }];
  });
}
