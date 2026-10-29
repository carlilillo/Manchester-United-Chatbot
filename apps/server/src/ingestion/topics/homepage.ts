import { load, type CheerioAPI } from 'cheerio';
import { clean, nextRecords, walk } from '../utils/next-data';
import { ScrapeSession } from '../utils/scrape-session';
import { absoluteUrl, CLUB, markdownText, markdownUrl } from '../utils/source-links';

type Highlight = { title: string; source?: string; image?: string; facts?: [string, string][] };
type Card = ReturnType<CheerioAPI>;
const SECTION_COMPONENTS = [
  'HeroHeaderBlock',
  'NewsCarousel',
  'MatchPlaylistCarousel',
  'PlaylistCarousel',
  'FixtureSummaryBlock',
  'PromoCarousel',
  'GatewayCarousel',
];
const STOP_HEADING = /^(become a member today|tickets (?:and|&) tours)$/i;

/** Recover destinations for video cards whose visible action is a login button. */
function videoSources(html: string): Map<string, string> {
  const sources = new Map<string, string>();
  for (const record of nextRecords(html))
    for (const item of walk(record)) {
      if (typeof item.title !== 'string' || typeof item.slug !== 'string') continue;
      const source = absoluteUrl(item.slug, CLUB);
      if (source && new URL(source).pathname.startsWith('/en/mutv/videos/detail/'))
        sources.set(clean(item.title), source);
    }
  return sources;
}

/** Read one card's meaningful fields without concatenating its controls or category links. */
function mediaHighlight(card: Card, videos: Map<string, string>): Highlight | undefined {
  const title = clean(card.find('h1,h2,h3,h4,h5,h6').first().text());
  if (!title) return undefined;
  return {
    title,
    source: absoluteUrl(card.find('a[href]').first().attr('href'), CLUB) || videos.get(title),
    image: absoluteUrl(card.find('img').first().attr('src'), CLUB),
  };
}

/** Keep match summary facts in labelled fields; loading placeholders are omitted. */
function matchHighlight(card: Card, $: CheerioAPI): Highlight | undefined {
  const field = (name: string) =>
    clean(card.find(`[data-testid="fixture-summary-card__${name}"]`).text());
  const home = field('home-name');
  const away = field('away-name');
  if (!home || !away) return undefined;
  const link = card
    .find('a[href]')
    .filter((_index, element) => clean($(element).text()) === 'Match Centre')
    .first();
  const label = clean(card.closest('li').find('[class*="carouselCardLabel"]').text());
  const facts: [string, string][] = [
    ['Date', field('date')],
    ['Competition', field('competition')],
    ['Venue', field('venue')],
    ['Score', field('score-container')],
    ['Status', field('status-label')],
  ];
  return {
    title: `${label ? `${label}: ` : ''}${home} v ${away}`,
    source: absoluteUrl(link.attr('href'), CLUB),
    facts,
  };
}

/** Format a card once, using the same heading/label pattern as the people directories. */
function highlightMarkdown(item: Highlight): string {
  const fields = [
    ...(item.facts || [])
      .filter(([, value]) => value)
      .map(([label, value]) => `- ${label}: ${markdownText(value)}`),
    ...(item.source ? [`- Source: [Official page](${markdownUrl(item.source)})`] : []),
    ...(item.image ? [`- Image: [Image](${markdownUrl(item.image)})`] : []),
  ].join('\n');
  return `### ${markdownText(item.title)}\n\n${fields}`;
}

/** Preserve homepage section order and stop at the first excluded promotional section. */
export function homepageMarkdown(html: string): string {
  const $ = load(html);
  const videos = videoSources(html);
  const seen = new Set<string>();
  const sections: string[] = [];
  const selector = SECTION_COMPONENTS.map(
    (component) => `main [data-component="${component}"]`,
  ).join(',');
  for (const element of $(selector).toArray()) {
    const block = $(element);
    const component = block.attr('data-component');
    const heading = clean(block.find('h1,h2,h3').first().text());
    // A hard cutoff also excludes every later section, even if it contains otherwise valid cards.
    if (STOP_HEADING.test(heading)) break;
    const title = component === 'HeroHeaderBlock' ? 'Featured story' : heading || 'Match videos';
    const cards =
      component === 'HeroHeaderBlock'
        ? block
        : block.find(
            '[data-testid="article-card"], [data-testid="video-card"], [data-testid="promo-card"], [data-testid="fixture-summary-card"]',
          );
    const items: Highlight[] = [];
    cards.each((_index, node) => {
      const card = $(node);
      const item =
        card.attr('data-testid') === 'fixture-summary-card'
          ? matchHighlight(card, $)
          : mediaHighlight(card, videos);
      if (!item) return;
      // Titles distinguish promotions sharing a destination; responsive copies share both fields.
      const key =
        card.attr('data-testid') === 'fixture-summary-card' && item.source
          ? item.source
          : `${item.source || ''}:${item.title.toLowerCase()}`;
      if (seen.has(key)) return;
      seen.add(key);
      items.push(item);
    });
    if (items.length)
      sections.push(`## ${markdownText(title)}\n\n${items.map(highlightMarkdown).join('\n\n')}`);
  }
  if (!sections.length) throw new Error('No homepage highlights found');
  return `# Manchester United highlights\n\n${sections.join('\n\n')}`;
}

/** Save only the structured highlights; retain HTML for the separate video workflow. */
export async function scrapeHomepage(session: ScrapeSession): Promise<string> {
  return session.capture(`${CLUB}/en`, 'homepage/highlights.md', 'homepage', homepageMarkdown);
}
