import { load } from 'cheerio';
import { env } from '../config/env';
import { scrapeNews } from './topics/news';
import { scrapeMatches } from './topics/matches';
import { scrapeMembership } from './topics/membership';
import { scrapeStore } from './topics/store';
import { scrapePeople } from './topics/people';
import { scrapeHomepage } from './topics/homepage';
import type { IngestionTopic } from './schedules';
import { ScrapeSession } from './utils/scrape-session';
import { CLUB, nameFor } from './utils/source-links';
import type { CapturedPage } from './types';

export type { CapturedPage } from './types';

/** Limit homepage video discovery to the women's section. */
function womenVideoLinks(html: string): string[] {
  const $ = load(html);
  const heading = $('h2, h3')
    .filter((_index, element) => $(element).text().trim().toLowerCase() === "women's videos")
    .first();
  const section = heading.closest('section');
  const found = new Set<string>();
  section.find('a[href]').each((_index, element) => {
    try {
      const url = new URL($(element).attr('href')!, CLUB);
      if (url.hostname === 'www.manutd.com' && url.pathname.includes('/mutv/videos/detail/'))
        found.add(url.toString());
    } catch {
      /* Ignore invalid source links. */
    }
  });
  return [...found];
}

/** Run extraction for the requested topics with shared request limits and per-source error reporting. */
export async function scrapeTopics(
  topics: readonly IngestionTopic[],
  error: (message: string) => void,
): Promise<CapturedPage[]> {
  const session = new ScrapeSession(error);
  const selected = new Set(topics);
  const season = process.env.SEASON_ID || '20262027';
  const homeHtml = selected.has('homepage') ? await scrapeHomepage(session) : undefined;
  if (selected.has('news')) await scrapeNews(session, env().NEWS_PAGES);
  if (selected.has('matches')) await scrapeMatches(session, season);
  if (selected.has('people')) await scrapePeople(session);
  if (selected.has('membership')) await scrapeMembership(session, season);
  if (selected.has('store')) await scrapeStore(session);
  if (selected.has('travel')) {
    await session.capture(
      `${CLUB}/en/club/visit-old-trafford/getting-here`,
      'travel/getting-here.md',
      'travel',
    );
  }
  if (selected.has('videos')) await scrapeVideos(session, homeHtml);
  return session.pages;
}

/** Video links are discovered on the homepage, which is fetched again only when not captured. */
async function scrapeVideos(session: ScrapeSession, homeHtml?: string): Promise<void> {
  if (homeHtml === undefined) {
    try {
      homeHtml = await session.html(`${CLUB}/en`, 'videos/women.md');
    } catch (error) {
      session.reportError(`${CLUB}/en: ${String(error)}`);
      return;
    }
  }
  const videos = womenVideoLinks(homeHtml);
  if (videos.length) {
    session.add(
      `${CLUB}/en`,
      'videos/women.md',
      'videos',
      '# United videos\n' + videos.map((url) => `- [${nameFor(url)}](${url})`).join('\n'),
    );
  }
  await session.details(videos, 'videos/women', 'videos');
}
