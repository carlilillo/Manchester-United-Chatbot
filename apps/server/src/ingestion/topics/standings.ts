import { clean, isObject, nextRecords, walk } from '../utils/next-data';
import { ScrapeSession } from '../utils/scrape-session';
import { CLUB, markdownText } from '../utils/source-links';

const TABLE_ENDPOINT = 'https://mufc-prd.stadion.io/statsperform/football/league-table/latest';

/** Read the selected competition and season IDs from the club's own table widget. */
export function standingsRequest(html: string, source: string): { url: string; title: string } {
  const competitionSlug = new URL(source).pathname.split('/table/')[1]?.split('/')[0];
  for (const record of nextRecords(html)) {
    for (const props of walk(record)) {
      if (!Array.isArray(props.headRowCells) || !Array.isArray(props.competitions)) continue;
      const competition = props.competitions.find(item => isObject(item) && item.slug === competitionSlug);
      if (!isObject(competition)) continue;
      const params = { teamId: props.teamId, competitionId: competition.dataProviderId, seasonId: props.seasonId };
      if (!Object.values(params).every(value => typeof value === 'string' && /^[a-z0-9]+$/i.test(value))) continue;
      const url = new URL(TABLE_ENDPOINT);
      for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
      url.searchParams.set('locale', 'en-GB');
      return { url: url.toString(), title: clean(competition.name) };
    }
  }
  throw new Error(`No standings widget configuration for ${source}`);
}

/** Render actual table rows; refuse navigation-only or malformed responses. */
export function standingsMarkdown(data: unknown, title: string, season: string, apiUrl: string): string {
  if (!isObject(data) || !Array.isArray(data.rows) || !data.rows.length) {
    throw new Error(`No standings rows returned for ${title}`);
  }
  const fields = ['position', 'played', 'won', 'drawn', 'lost', 'goalsFor', 'goalsAgainst', 'goalDifference', 'points'];
  const rows = data.rows.map(row => {
    if (!isObject(row) || !isObject(row.club) || typeof row.club.name !== 'string' ||
        fields.some(field => !['number', 'string'].includes(typeof row[field]) ||
          clean(row[field]) === '' || !Number.isFinite(Number(row[field])))) {
      throw new Error(`Invalid standings row for ${title}`);
    }
    const form = Array.isArray(row.recentForm) ? row.recentForm.map(clean).join(' ') : '';
    const next = isObject(row.nextOpponentClub) ? clean(row.nextOpponentClub.name) : '';
    return [row.position, row.club.name, ...fields.slice(1).map(field => row[field]), form, next]
      .map(value => markdownText(clean(value))).join(' | ');
  });
  return [
    `# ${title} — ${season.slice(0, 4)}/${season.slice(4)}`,
    '',
    `Data: [Official club standings feed](${apiUrl})`,
    '',
    '| Position | Club | Played | Won | Drawn | Lost | GF | GA | GD | Points | Form | Next opponent |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...rows.map(row => `| ${row} |`),
  ].join('\n');
}

/** Fetch all three requested club standings pages and their public JSON table feeds. */
export async function scrapeStandings(session: ScrapeSession, season: string): Promise<void> {
  const tables = [
    ['mens', 'premier-league', 'standings-men-premier-league'],
    ['mens', 'uefa-champions-league', 'standings-men-champions-league'],
    ['womens', 'womens-super-league', 'standings-women-super-league'],
  ];
  for (const [team, competition, filename] of tables) {
    const source = `${CLUB}/en/matches/${team}-team/table/${competition}/${season}-${competition}`;
    const path = `matches/${filename}.md`;
    try {
      const html = await session.html(source, path);
      const request = standingsRequest(html, source);
      const data = await session.json(request.url, path);
      session.add(source, path, 'matches', standingsMarkdown(data, request.title, season, request.url));
    } catch (error) { session.reportError(`${source}: ${String(error)}`); }
  }
}
