import { afterEach, describe, expect, it, vi } from 'vitest';
import { Logger } from '@nestjs/common';
import { newsItems, newsListingMarkdown } from '../src/ingestion/topics/news';
import { matchItems, matchListingMarkdown, matchReportMarkdown } from '../src/ingestion/topics/matches';
import { standingsRequest, standingsMarkdown, scrapeStandings } from '../src/ingestion/topics/standings';
import { scrapeMembership } from '../src/ingestion/topics/membership';
import { scrapeStore } from '../src/ingestion/topics/store';
import { HttpFetchError } from '../src/ingestion/fetch-page';
import { ScrapeSession } from '../src/ingestion/utils/scrape-session';
import { isObsoleteCapture } from '../src/ingestion/utils/obsolete-captures';

/** Model the streamed JSON records used by the current official site. */
const flight = (value: unknown) => `<main>Loading</main><script>self.__next_f.push(${JSON.stringify([1, `0:${JSON.stringify(value)}\n`])})</script>`;
const element = (props: Record<string, unknown>) => ['$', 'div', null, props];
const reportUrl = 'https://www.manutd.com/en/news/united-match-report';
afterEach(() => vi.restoreAllMocks());

describe('news listings', () => {
  it('writes one title, source and image per story without responsive duplicates or category boilerplate', () => {
    const card = `<li><article data-testid="article-card"><a href="/en/news/story"><span>Story</span></a>
      <img src="/story.jpg"/><a href="/en/news/category/news">News</a><span>an hour ago</span><h5>United win</h5></article></li>`;
    const items = newsItems(`<main><ul><li><a href="/en/news/listing/mens-news">Men's Team</a></li>${card}${card}</ul><a href="/en/news/category/news">News</a></main>`, 'https://www.manutd.com/en/news?page=1');
    expect(items).toEqual([{ title: 'United win', source: 'https://www.manutd.com/en/news/story', image: 'https://www.manutd.com/story.jpg' }]);
    const markdown = newsListingMarkdown(items, 1);
    expect(markdown.match(/United win/g)).toHaveLength(1);
    expect(markdown).not.toMatch(/hour ago|category|#####/);
    expect(markdown).toContain('Image: [Image](https://www.manutd.com/story.jpg)');
  });

  it('rejects a navigation-only page instead of saving a misleading listing', () => {
    expect(() => newsListingMarkdown([], 1)).toThrow('No news article cards');
  });
});

describe('match listings and reports', () => {
  it('reads streamed match facts and follows report CTAs instead of standings navigation', () => {
    const row = element({ id: 'fixture-united-opponent', children: [
      element({ className: 'fixturesResultsTemplate_clubName__123', children: 'United' }),
      element({ className: 'fixturesResultsTemplate_clubName__123', children: 'Opponent' }),
      element({ fixtureId: '1', matchStatus: 'FullTime', homeScore: 2, awayScore: 1, kickOffTime: '15:00' }),
      element({ 'data-testid': 'fixtures-results__venue', children: 'Old Trafford' }),
      element({ text: 'Match Centre', url: '/en/matches/mens-team/united-v-opponent-20261010' }),
      element({ text: 'Match Report', url: reportUrl }),
      element({ text: 'Standings', url: '/en/matches/mens-team/table' }),
    ] });
    const section = element({ 'data-testid': 'fixtures-results__section', 'aria-labelledby': 'fixture-day-2026-10-10-premier-league', children: [
      element({ 'data-testid': 'fixture-day-header__date', children: 'Saturday 10 October' }),
      element({ 'data-testid': 'fixture-day-header__competition', children: 'Premier League' }), row,
    ] });
    const items = matchItems(flight([section, section]));
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ home: 'United', away: 'Opponent', homeScore: 2, awayScore: 1, report: reportUrl, date: '2026-10-10' });
    const markdown = matchListingMarkdown(items, 'mens', 'results');
    expect(markdown).toContain('Score: 2–1');
    expect(markdown).not.toContain('/table');
    const upcoming = matchListingMarkdown([{ ...items[0], status: 'PreMatch', homeScore: 0, awayScore: 0 }], 'mens', 'fixtures');
    expect(upcoming).not.toContain('Score:');
  });

  it('refuses to treat a match-centre shell as a written report', () => {
    expect(() => matchReportMarkdown('<main><h1>United v Opponent</h1><p>Standings and live scores</p></main>'))
      .toThrow('No written match report');
  });

  it('keeps the full report body from the embedded article', () => {
    const prose = 'United scored the winner after a sustained spell of pressure in the second half. '.repeat(3);
    const markdown = matchReportMarkdown(flight({ articleTitle: 'United 2 Opponent 1', bodyCopy: {
      json: { nodeType: 'document', content: [{ nodeType: 'paragraph', content: [{ nodeType: 'text', value: prose }] }] },
    } }));
    expect(markdown).toContain(prose.trim());
  });
});

describe('official standings', () => {
  const html = flight({ headRowCells: [], teamId: 'team123', seasonId: 'season456', competitions: [
    { slug: 'premier-league', dataProviderId: 'competition789', name: 'Premier League' },
  ] });
  const source = 'https://www.manutd.com/en/matches/mens-team/table/premier-league/20262027-premier-league';

  it('constructs the same public data request as the selected page widget', () => {
    const request = standingsRequest(html, source);
    const url = new URL(request.url);
    expect(url.origin).toBe('https://mufc-prd.stadion.io');
    expect(Object.fromEntries(url.searchParams)).toEqual({ teamId: 'team123', competitionId: 'competition789', seasonId: 'season456', locale: 'en-GB' });
    expect(() => standingsRequest('<main>Premier League</main>', source)).toThrow('No standings widget');
  });

  it('renders standings including zeroes and rejects missing rows or statistics', () => {
    const row = { club: { name: 'United' }, position: 1, played: 2, won: 2, drawn: 0, lost: 0, goalsFor: 4, goalsAgainst: 0, goalDifference: '+4', points: 6 };
    expect(standingsMarkdown({ rows: [row] }, 'Premier League', '20262027', 'https://example.com'))
      .toContain('| 1 | United | 2 | 2 | 0 | 0 | 4 | 0 | +4 | 6 |');
    expect(() => standingsMarkdown({ rows: [] }, 'PL', '20262027', '')).toThrow('No standings rows');
    expect(() => standingsMarkdown({ rows: [{ ...row, points: null }] }, 'PL', '20262027', '')).toThrow('Invalid standings row');
  });

  it('requests all three exact club competition pages, including the women’s table', async () => {
    const session = new ScrapeSession(vi.fn());
    const fetch = vi.spyOn(session, 'html').mockRejectedValue(new Error('offline'));
    await scrapeStandings(session, '20262027');
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      source,
      'https://www.manutd.com/en/matches/mens-team/table/uefa-champions-league/20262027-uefa-champions-league',
      'https://www.manutd.com/en/matches/womens-team/table/womens-super-league/20262027-womens-super-league',
    ]);
  });
});

describe('membership fallback and store discovery', () => {
  it('uses club membership tiers with accurate provenance when ticketing returns 403', async () => {
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const errors = vi.fn();
    const session = new ScrapeSession(errors);
    vi.spyOn(session, 'html').mockImplementation(async source => {
      if (source.includes('tickets.')) throw new HttpFetchError(403, source);
      return '<main><section><h2>Premium Membership</h2><p>£70 per season</p><p>Access to home match tickets and discounts on club merchandise.</p></section></main>';
    });
    await scrapeMembership(session, '20262027');
    expect(errors).not.toHaveBeenCalled();
    const comparison = session.pages.find(page => page.path === 'membership/comparison.md')!;
    expect(comparison.source).toBe('https://www.manutd.com/en/become-a-member-in-2026-27');
    expect(comparison.markdown).toContain('£70 per season');
    expect(comparison.markdown).toContain('season Access');
    expect(Logger.prototype.warn).toHaveBeenCalledWith(expect.stringContaining('HTTP 403'));
  });

  it('does not hide ticketing errors unrelated to an access denial', async () => {
    const error = vi.fn();
    const session = new ScrapeSession(error);
    vi.spyOn(session, 'html').mockRejectedValue(new HttpFetchError(500, 'https://tickets.manutd.com/memberships'));
    await scrapeMembership(session, '20262027');
    expect(error).toHaveBeenCalledWith(expect.stringContaining('HTTP 500'));
    expect(session.pages).toEqual([]);
  });

  it('uses even text-empty categories to discover products and saves no catalog pages', async () => {
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const session = new ScrapeSession(vi.fn());
    vi.spyOn(session, 'html').mockResolvedValue('<main><a href="/en-gb/p/shirt">Shirt</a></main>');
    const details = vi.spyOn(session, 'details').mockResolvedValue(undefined);
    await scrapeStore(session);
    expect(details).toHaveBeenCalledWith(['https://store.manutd.com/en-gb/p/shirt'], 'store/products', 'store', expect.any(Function));
    expect(session.pages).toEqual([]);
  });
});

describe('obsolete capture cleanup', () => {
  it('removes catalog and misclassified navigation documents, retaining real reports/products', () => {
    expect(isObsoleteCapture('store/catalog/kit.md', 'https://store.manutd.com/en-gb/c/kit')).toBe(true);
    expect(isObsoleteCapture('matches/reports/table.md', 'https://www.manutd.com/en/matches/mens-team/table')).toBe(true);
    expect(isObsoleteCapture('news/articles/news.md', 'https://www.manutd.com/en/news/category/news')).toBe(true);
    expect(isObsoleteCapture('news/articles/mens-news.md', 'https://www.manutd.com/en/news/listing/mens-news')).toBe(true);
    expect(isObsoleteCapture('matches/reports/report.md', reportUrl)).toBe(false);
    expect(isObsoleteCapture('store/products/shirt.md', 'https://store.manutd.com/en-gb/p/shirt')).toBe(false);
  });
});
