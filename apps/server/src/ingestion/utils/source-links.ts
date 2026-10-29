import { load } from 'cheerio';
import { createHash } from 'node:crypto';

export const CLUB = 'https://www.manutd.com';
export const SHOP = 'https://store.manutd.com';

/** Resolve an HTTP link and strip fragments so duplicate cards share one identity. */
export function absoluteUrl(value: string | undefined, base: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value, base);
    if (!['https:', 'http:'].includes(url.protocol)) return undefined;
    url.hash = '';
    return url.toString();
  } catch {
    return undefined;
  }
}

/** Keep article pages while excluding category, tag, and pagination navigation. */
export function isNewsArticle(url: URL): boolean {
  return (
    url.origin === CLUB &&
    /^\/en\/news\/(?!category(?:\/|$)|listing(?:\/|$)|page(?:\/|$)|tag(?:s)?(?:\/|$))[^/]+(?:\/[^/]+)?\/?$/.test(
      url.pathname,
    )
  );
}

/** Collect unique links from page content that satisfy a topic-specific predicate. */
export function links(html: string, base: string, predicate: (url: URL) => boolean): string[] {
  const $ = load(html);
  const found = new Set<string>();
  $('main a[href], article a[href], a[data-testid][href]').each((_index, element) => {
    const value = absoluteUrl($(element).attr('href'), base);
    if (value && predicate(new URL(value))) found.add(value);
  });
  return [...found];
}

/** Derive a readable filename stem from the source URL. */
export function nameFor(url: string): string {
  return (new URL(url).pathname.split('/').filter(Boolean).at(-1) || 'index')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .slice(0, 90);
}

/** Keep filenames stable and disambiguate sources with the same final path segment. */
export function uniqueNameFor(url: string): string {
  return `${nameFor(url)}-${createHash('sha256').update(url).digest('hex').slice(0, 10)}`;
}

/** Escape text and destinations used in generated Markdown listings. */
export const markdownText = (value: string) => value.replace(/([\\`*_[\]<>|])/g, '\\$1');
export const markdownUrl = (value: string) =>
  value.replace(/[()\s]/g, (character) => encodeURIComponent(character));
