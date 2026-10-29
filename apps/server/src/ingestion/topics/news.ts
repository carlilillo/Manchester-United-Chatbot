import { load } from 'cheerio';
import { ScrapeSession } from '../utils/scrape-session';
import { absoluteUrl, CLUB, isNewsArticle, markdownText, markdownUrl } from '../utils/source-links';

export type NewsItem = { title: string; source: string; image?: string };

/** Read each news card once, ignoring responsive duplicates and category navigation. */
export function newsItems(html: string, source: string): NewsItem[] {
  const $ = load(html);
  const items = new Map<string, NewsItem>();
  const articleCards = $('main [data-testid="article-card"]');
  const cards = articleCards.length ? articleCards : $('main article, main li');
  cards.each((_index, element) => {
    const card = $(element);
    const anchors = card.find('a[href]').toArray();
    const article = anchors.find((anchor) => {
      const href = absoluteUrl($(anchor).attr('href'), source);
      return href && isNewsArticle(new URL(href));
    });
    if (!article) return;
    const href = absoluteUrl($(article).attr('href'), source)!;
    const title = card.find('h2, h3, h4, h5, h6').first().text().trim() || $(article).text().trim();
    if (!title) return;
    const image = absoluteUrl(card.find('img').first().attr('src'), source);
    const existing = items.get(href);
    if (!existing || (!existing.image && image)) items.set(href, { title, source: href, image });
  });
  return [...items.values()];
}

/** Render only the title, source, and image URL for each news item. */
export function newsListingMarkdown(items: NewsItem[], pageNumber: number): string {
  if (!items.length) throw new Error('No news article cards found');
  return (
    `# News — page ${pageNumber}\n\n` +
    items
      .map((item) =>
        [
          `- ${markdownText(item.title)}`,
          `  - Source: [Article](${markdownUrl(item.source)})`,
          ...(item.image ? [`  - Image: [Image](${markdownUrl(item.image)})`] : []),
        ].join('\n'),
      )
      .join('\n\n')
  );
}

/** Store compact listings and discover articles only from the cards on each page. */
export async function scrapeNews(session: ScrapeSession, pageCount: number): Promise<void> {
  const articleUrls = new Set<string>();
  for (let page = 1; page <= pageCount; page++) {
    const source = `${CLUB}/en/news?page=${page}`;
    const path = `news/pages/page-${String(page).padStart(2, '0')}.md`;
    try {
      const html = await session.html(source, path);
      const items = newsItems(html, source);
      session.add(source, path, 'news', newsListingMarkdown(items, page));
      items.forEach((item) => articleUrls.add(item.source));
    } catch (error) {
      session.reportError(`${source}: ${String(error)}`);
    }
  }
  await session.details([...articleUrls], 'news/articles', 'news');
}
