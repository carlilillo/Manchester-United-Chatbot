import { describe, expect, it, vi } from 'vitest';
import { homepageMarkdown, scrapeHomepage } from '../src/ingestion/topics/homepage';
import { productMarkdown } from '../src/ingestion/utils/product-content';
import { ScrapeSession } from '../src/ingestion/utils/scrape-session';
import { isObsoleteCapture } from '../src/ingestion/utils/obsolete-captures';

const source = 'https://www.manutd.com/en';
const story = (title: string, slug = title) =>
  `<article data-testid="article-card"><a href="/en/news/${slug}">Duplicate link title</a><img src="/story.jpg"/><a href="/en/news/category/news">News</a><h3>${title}</h3><span>1 hour ago</span></article>`;
const news = (title: string, cards: string) =>
  `<div data-component="NewsCarousel"><h2>${title}</h2>${cards}</div>`;
const flight = (value: unknown) =>
  `<script>self.__next_f.push(${JSON.stringify([1, `0:${JSON.stringify(value)}\n`])})</script>`;

describe('structured homepage', () => {
  it('groups cards in page order and removes responsive duplicates, controls and boilerplate', () => {
    const html = `<main><div data-component="HeroHeaderBlock"><a href="/en/news/hero">Read</a><img src="/hero.jpg"/><h1>Featured</h1><button>Next slide</button></div>
      ${news('Latest news', story('Story') + story('Story'))}${news('United Women news', story('Women'))}</main>`;
    const md = homepageMarkdown(html);
    expect(md).toContain('# Manchester United highlights');
    expect(md).toContain('## Featured story\n\n### Featured\n\n- Source:');
    expect(md.indexOf('Latest news')).toBeLessThan(md.indexOf('United Women news'));
    expect(md.match(/### Story/g)).toHaveLength(1);
    expect(md).toContain('- Image: [Image](https://www.manutd.com/story.jpg)');
    expect(md).not.toMatch(/Next slide|Duplicate link|1 hour ago|category\/news/);
  });

  it.each(['Tickets and tours', 'Become a Member today'])(
    'excludes %s and everything after it',
    (title) => {
      const md = homepageMarkdown(
        `<main>${news('Latest news', story('Keep'))}<section data-component="PromoCarousel"><h3>${title}</h3>${story('Excluded')}</section>${news('Later news', story('Must not appear'))}<footer>${story('Footer')}</footer></main>`,
      );
      expect(md).toContain('### Keep');
      expect(md).not.toMatch(/Tickets|Member|Excluded|Later news|Must not appear|Footer/);
    },
  );

  it('recovers a gated video destination without including login controls or later embedded stories', () => {
    const md = homepageMarkdown(
      `<main><section data-component="PlaylistCarousel"><h2>Women's videos</h2><section data-testid="video-card"><button>Login to Watch</button><h5>Interview</h5><img src="/video.jpg"/></section></section></main>` +
        flight([
          { title: 'Interview', slug: '/en/mutv/videos/detail/interview' },
          { title: 'Unrelated', slug: '/en/mutv/videos/detail/unrelated' },
        ]),
    );
    expect(md).toContain('https://www.manutd.com/en/mutv/videos/detail/interview');
    expect(md).not.toMatch(/Login|Unrelated/);
  });

  it('deduplicates match summaries even when the mobile copy has no label', () => {
    const match = `<article data-testid="fixture-summary-card"><span data-testid="fixture-summary-card__home-name">United</span><span data-testid="fixture-summary-card__away-name">Opponent</span><span data-testid="fixture-summary-card__score-container">2 - 0</span><span data-testid="fixture-summary-card__competition">League</span><a href="/en/matches/game">Match Centre</a></article>`;
    const md = homepageMarkdown(
      `<main><section data-component="FixtureSummaryBlock"><h2>Matches</h2><li><span class="fixtureSummaryBlock_carouselCardLabel">Last Match</span>${match}</li>${match}</section></main>`,
    );
    expect(md.match(/United v Opponent/g)).toHaveLength(1);
    expect(md).toContain('- Score: 2 - 0');
    expect(md).toContain('- Competition: League');
  });

  it('captures only highlights and rejects an empty/loading homepage', async () => {
    const session = new ScrapeSession(vi.fn());
    vi.spyOn(session, 'html').mockResolvedValue(
      `<main>${news('Latest news', story('Story'))}</main>`,
    );
    await scrapeHomepage(session);
    expect(session.pages.map((page) => page.path)).toEqual(['homepage/highlights.md']);
    expect(() => homepageMarkdown('<main>Loading</main>')).toThrow('No homepage highlights');
    expect(isObsoleteCapture('homepage/store-highlights.md', source)).toBe(true);
    expect(isObsoleteCapture('homepage/tickets-and-tours.md', source)).toBe(true);
    expect(isObsoleteCapture('homepage/highlights.md', source)).toBe(false);
  });
});

describe('product recommendations', () => {
  it('keeps the first complete look, removes its trailing copy and preserves product/review content', () => {
    const look = `<section id="get-the-look" data-test-id="cross-selling-section"><h2>Get The Look</h2><p>Matching shorts</p></section>`;
    const html = `<main><h1>United shirt</h1><p>Original product description.</p>${look}<section id="product-reviews"><h2>Reviews</h2><p>A customer review.</p></section>${look}<div class="product-carousel"><div><h2>You may also like</h2></div><p>Unwanted recommendation</p></div></main>`;
    const md = productMarkdown(html, 'https://store.manutd.com/en-gb/p/shirt');
    expect(md.match(/## Complete the Look/g)).toHaveLength(1);
    expect(md.match(/Matching shorts/g)).toHaveLength(1);
    expect(md).toContain('Original product description.');
    expect(md).toContain('A customer review.');
    expect(md.indexOf('Complete the Look')).toBeLessThan(md.indexOf('Reviews'));
    expect(md).not.toMatch(/Get The Look|You may also like|Unwanted recommendation/);
  });

  it('handles products without a look section and removes an empty recommendation heading', () => {
    const md = productMarkdown(
      '<main><h1>United mug</h1><p>Ceramic mug with a printed club crest.</p><div class="product-carousel"><h2>You may also like</h2></div></main>',
      'https://store.manutd.com/en-gb/p/mug',
    );
    expect(md).toContain('Ceramic mug');
    expect(md).not.toMatch(/Complete the Look|You may also like/);
  });
});
