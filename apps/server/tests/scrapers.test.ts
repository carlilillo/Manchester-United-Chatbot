import { afterEach, describe, expect, it, vi } from 'vitest';
import { Logger } from '@nestjs/common';
import { fetchPage } from '../src/ingestion/fetch-page';
import { ScrapeSession } from '../src/ingestion/utils/scrape-session';

vi.mock('../src/ingestion/fetch-page', () => ({ fetchPage: vi.fn(), fetchJson: vi.fn() }));
afterEach(() => vi.restoreAllMocks());

describe('scrape logging and failure isolation', () => {
  it('logs all fetched pages, including discovery-only pages and rejected conversions', async () => {
    const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const error = vi.fn();
    const session = new ScrapeSession(error);
    vi.mocked(fetchPage).mockResolvedValue('<main></main>');
    await session.html('https://store.manutd.com/en-gb/c/kit/home/mens', 'store/products/ (discovery only)');
    const html = await session.capture('https://www.manutd.com/en/news/empty', 'news/articles/empty.md', 'news');
    expect(html).toBe('<main></main>');
    expect(session.pages).toEqual([]);
    expect(log.mock.calls.filter(([message]) => String(message).startsWith('Fetched HTML:'))).toHaveLength(2);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('Missing meaningful Markdown'));
  });

  it('deduplicates details within each topic without losing a report already captured as news', async () => {
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    vi.mocked(fetchPage).mockResolvedValue('<main><h1>United report</h1><p>A strong performance from the team and a memorable result for the fans.</p></main>');
    const session = new ScrapeSession(vi.fn());
    const url = 'https://www.manutd.com/en/news/report';
    await session.details([url, url], 'news/articles', 'news');
    await session.details([url, url], 'matches/reports', 'matches');
    expect(session.pages).toHaveLength(2);
    expect(session.pages.map(page => page.type)).toEqual(['news', 'matches']);
  });
});
