import { load } from 'cheerio';
import { HttpFetchError } from '../utils/fetch-page';
import { htmlToMarkdown } from '../utils/html-to-markdown';
import { ScrapeSession } from '../utils/scrape-session';
import { CLUB, markdownText } from '../utils/source-links';

/** Build a comparison from the membership tiers actually published on the club website. */
export function membershipComparison(html: string): string {
  const $ = load(html);
  const tiers = new Map<string, string>();
  $('main h2').each((_index, element) => {
    const heading = $(element).text().trim();
    if (!/Membership/i.test(heading)) return;
    const section = $(element).closest('section').clone();
    section.find('a, button, img, h2').remove();
    // Block elements are adjacent in minified HTML; retain their word boundaries.
    section.find('div, p, h3, h4, li, br').append('\n');
    const text = section.text().replace(/\s+/g, ' ').trim();
    if (text) tiers.set(heading, text);
  });
  if (!tiers.size) throw new Error('No membership tiers found on the official club page');
  return (
    '# Membership comparison\n\n' +
    [...tiers]
      .map(([title, description]) => `## ${markdownText(title)}\n\n${markdownText(description)}`)
      .join('\n\n')
  );
}

/** Fall back to published club tiers when ticketing denies unattended requests. */
export async function scrapeMembership(session: ScrapeSession, season: string): Promise<void> {
  const clubSource = `${CLUB}/en/become-a-member-in-${season.slice(0, 4)}-${season.slice(6)}`;
  const clubHtml = await session.capture(clubSource, 'membership/membership.md', 'membership');
  const ticketSource = 'https://tickets.manutd.com/memberships';
  const path = 'membership/comparison.md';
  try {
    const html = await session.html(ticketSource, path);
    if (/Please enable JS and disable any ad blocker|captcha-delivery\.com/i.test(html)) {
      throw new HttpFetchError(403, ticketSource);
    }
    session.add(ticketSource, path, 'membership', htmlToMarkdown(html, ticketSource));
  } catch (error) {
    if (error instanceof HttpFetchError && error.status === 403 && clubHtml) {
      session.logger.warn(
        `Ticketing returned HTTP 403; using published membership tiers from ${clubSource}`,
      );
      try {
        // Cite the content we actually fetched, not the blocked ticketing source.
        session.add(clubSource, path, 'membership', membershipComparison(clubHtml));
        return;
      } catch (fallbackError) {
        session.reportError(`${clubSource}: ${String(fallbackError)}`);
      }
    }
    session.reportError(`${ticketSource}: ${String(error)}`);
  }
}
