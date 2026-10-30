import { isNewsArticle } from './source-links';

export const RETIRED_HOMEPAGE_PATHS = [
  'homepage/store-highlights.md',
  'homepage/tickets-and-tours.md',
];

/** Identify retired homepage lists and documents produced by the former catalog/navigation crawler. */
export function isObsoleteCapture(file: string, source: string): boolean {
  if (RETIRED_HOMEPAGE_PATHS.includes(file)) return true;
  if (file.startsWith('store/catalog/')) return true;
  if (!file.startsWith('matches/reports/') && !file.startsWith('news/articles/')) return false;
  try {
    return !isNewsArticle(new URL(source));
  } catch {
    return false;
  }
}
