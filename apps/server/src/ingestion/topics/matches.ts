import { embeddedContentMarkdown } from '../embedded-content';
import { clean, isObject, JsonObject, nextRecords, walk } from '../utils/next-data';
import { ScrapeSession } from '../utils/scrape-session';
import { absoluteUrl, CLUB, isNewsArticle, markdownText } from '../utils/source-links';
import { scrapeStandings } from './standings';
import { calendarMonths } from '../utils/calendar-months';

export type MatchItem = {
  date: string; competition: string; home: string; away: string; venue: string;
  status: string; kickOffTime: string; homeScore?: number; awayScore?: number; centre?: string; report?: string;
};

/** Read plain child text from React elements without executing their components. */
function childText(value: unknown): string {
  if (typeof value === 'string') return value.startsWith('$') ? '' : value;
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    if (value[0] === '$' && isObject(value[3])) return childText(value[3].children);
    return value.map(childText).filter(Boolean).join(' ');
  }
  return isObject(value) ? childText(value.children) : '';
}

/** Keep only actual report links, never fixture, standings, or team navigation. */
function reportLink(nodes: JsonObject[]): string | undefined {
  const cta = nodes.find(node => clean(node.text).toLowerCase() === 'match report');
  const source = absoluteUrl(typeof cta?.url === 'string' ? cta.url : undefined, CLUB);
  return source && isNewsArticle(new URL(source)) ? source : undefined;
}

/** Extract fixture rows from the server's streamed result sections. */
export function matchItems(html: string): MatchItem[] {
  const matches = new Map<string, MatchItem>();
  for (const record of nextRecords(html)) {
    for (const section of walk(record)) {
      if (section['data-testid'] !== 'fixtures-results__section') continue;
      const nodes = [...walk(section)];
      const textFor = (testId: string) => clean(childText(nodes.find(node => node['data-testid'] === testId)));
      for (const row of nodes) {
        if (typeof row.id !== 'string' || !row.id.startsWith('fixture-')) continue;
        const rowNodes = [...walk(row)];
        const clubs = rowNodes.filter(node => typeof node.className === 'string' && node.className.includes('clubName'));
        const score = rowNodes.find(node => typeof node.matchStatus === 'string');
        if (clubs.length < 2 || !score) continue;
        const centreCta = rowNodes.find(node => node.text === 'Match Centre');
        matches.set(row.id, {
          date: /fixture-day-(\d{4}-\d{2}-\d{2})/.exec(clean(section['aria-labelledby']))?.[1] || textFor('fixture-day-header__date'),
          competition: textFor('fixture-day-header__competition'),
          home: clean(childText(clubs[0])), away: clean(childText(clubs[1])),
          venue: clean(childText(rowNodes.find(node => node['data-testid'] === 'fixtures-results__venue'))),
          status: clean(score.matchStatus),
          kickOffTime: clean(score.kickOffTime),
          homeScore: typeof score.homeScore === 'number' ? score.homeScore : undefined,
          awayScore: typeof score.awayScore === 'number' ? score.awayScore : undefined,
          centre: absoluteUrl(typeof centreCta?.url === 'string' ? centreCta.url : undefined, CLUB),
          report: reportLink(rowNodes),
        });
      }
    }
  }
  return [...matches.values()];
}

/** Save match facts and explicit report links, not the page's loading shell. */
export function matchListingMarkdown(matches: MatchItem[], team: string, kind: string): string {
  if (!matches.length) throw new Error(`No ${team} ${kind} data found in the page payload`);
  return `# ${team === 'mens' ? "Men's" : "Women's"} ${kind}\n\n` + matches.map(match => [
    `## ${markdownText(match.home)} v ${markdownText(match.away)}`,
    `- Date: ${markdownText(match.date)}`,
    `- Competition: ${markdownText(match.competition)}`,
    ...(match.venue ? [`- Venue: ${markdownText(match.venue)}`] : []),
    `- Status: ${match.status}`,
    ...(match.kickOffTime ? [`- Kick-off (as published): ${match.kickOffTime}`] : []),
    ...(match.status !== 'PreMatch' && match.homeScore !== undefined && match.awayScore !== undefined ? [`- Score: ${match.homeScore}–${match.awayScore}`] : []),
    ...(match.centre ? [`- [Match centre](${match.centre})`] : []),
    ...(match.report ? [`- [Match report](${match.report})`] : []),
  ].join('\n')).join('\n\n');
}

/** Combine monthly pages by match URL, preserving separate games against the same opponent. */
export function uniqueMatches(matches: MatchItem[]): MatchItem[] {
  const unique = new Map<string, MatchItem>();
  for (const match of matches) {
    const key = match.centre || `${match.date}:${match.competition}:${match.home}:${match.away}`;
    unique.set(key, match);
  }
  return [...unique.values()].sort((left, right) => left.date.localeCompare(right.date));
}

/** Recognize an actual calendar response even when a requested month has no scheduled games. */
function hasCalendar(html: string): boolean {
  return nextRecords(html).some(record => [...walk(record)].some(node =>
    typeof node.className === 'string' && node.className.includes('fixturesResultsTemplate')));
}

/** Read six months once per team and publish complete fixture/result windows independently. */
export async function scrapeMatchCalendar(session: ScrapeSession, team: string, now: Date): Promise<string[]> {
  const months = calendarMonths(now, [-2, -1, 0, 1, 2, 3]);
  const captured = new Map<string, MatchItem[]>();
  const reports = new Set<string>();
  for (const month of months) {
    // The club's monthly fixture route contains both completed and upcoming matches.
    const source = `${CLUB}/en/matches/${team}-team/fixtures?month=${month}`;
    try {
      const html = await session.html(source, `matches/${team}-fixtures.md / matches/${team}-results.md (${month})`);
      const matches = matchItems(html);
      if (!matches.length && !hasCalendar(html)) throw new Error(`No match calendar found for ${month}`);
      captured.set(month, matches.filter(match => match.date.startsWith(month)));
    } catch (error) { session.reportError(`${source}: ${String(error)}`); }
  }

  for (const kind of ['fixtures', 'results']) {
    const selectedMonths = kind === 'fixtures' ? months.slice(2) : months.slice(0, 3);
    // Do not replace a complete archive with a truncated one after a failed monthly fetch.
    if (selectedMonths.some(month => !captured.has(month))) continue;
    const matches = uniqueMatches(selectedMonths.flatMap(month => captured.get(month)!)).filter(match => {
      const finished = ['FullTime', 'AfterExtraTime', 'AfterPenalties', 'Played'].includes(match.status);
      return kind === 'results' ? finished : !finished;
    });
    const sources = selectedMonths.map(month => `- [${month}](${CLUB}/en/matches/${team}-team/fixtures?month=${month})`).join('\n');
    const content = matches.length ? matchListingMarkdown(matches, team, kind)
      : `# ${team === 'mens' ? "Men's" : "Women's"} ${kind}\n\nNo ${kind} published in the requested months.`;
    session.add(`${CLUB}/en/matches/${team}-team/${kind}`, `matches/${team}-${kind}.md`, 'matches',
      `${content}\n\n## Monthly sources\n\n${sources}`);
    if (kind === 'results') matches.forEach(match => { if (match.report) reports.add(match.report); });
  }
  return [...reports];
}

/** Require report prose; a match-centre heading or statistics shell is not a report. */
export function matchReportMarkdown(html: string): string {
  const markdown = embeddedContentMarkdown(html);
  if (!markdown || markdown.trim().length < 150) throw new Error('No written match report found');
  return markdown;
}

/** Capture real fixtures/results and follow only their explicit written-report calls to action. */
export async function scrapeMatches(session: ScrapeSession, season: string, now = new Date()): Promise<void> {
  const reports = new Set<string>();
  for (const team of ['mens', 'womens']) {
    const urls = await scrapeMatchCalendar(session, team, now);
    urls.forEach(url => reports.add(url));
  }
  await session.details([...reports], 'matches/reports', 'matches', matchReportMarkdown);
  await scrapeStandings(session, season);
}
