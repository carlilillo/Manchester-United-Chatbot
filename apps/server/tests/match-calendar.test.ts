import { afterEach, describe, expect, it, vi } from 'vitest';
import { calendarMonths } from '../src/ingestion/utils/calendar-months';
import { scrapeMatchCalendar } from '../src/ingestion/topics/matches';
import { ScrapeSession } from '../src/ingestion/utils/scrape-session';

const flight = (value: unknown) =>
  `<script>self.__next_f.push(${JSON.stringify([1, `0:${JSON.stringify(value)}\n`])})</script>`;
const element = (props: Record<string, unknown>) => ['$', 'div', null, props];
/** Supply both a completed and an upcoming fixture in every requested month. */
function calendar(month: string): string {
  const matches = ['FullTime', 'PreMatch'].map((status, index) =>
    element({
      'data-testid': 'fixtures-results__section',
      'aria-labelledby': `fixture-day-${month}-${index ? '28' : '01'}`,
      children: [
        element({ 'data-testid': 'fixture-day-header__competition', children: 'League' }),
        element({
          id: `fixture-${month}-${index}`,
          children: [
            element({ className: 'clubName', children: 'United' }),
            element({ className: 'clubName', children: 'Opponent' }),
            element({ matchStatus: status, homeScore: index ? 0 : 2, awayScore: 0 }),
            element({ text: 'Match Centre', url: `/en/matches/mens-team/game-${month}-${index}` }),
            ...(!index ? [element({ text: 'Match Report', url: `/en/news/report-${month}` })] : []),
          ],
        }),
      ],
    }),
  );
  return flight(
    element({ className: 'fixturesResultsTemplate_calendar', children: [...matches, ...matches] }),
  );
}
afterEach(() => vi.restoreAllMocks());

describe('rolling match calendar', () => {
  it('handles year rollover and Dublin month boundaries', () => {
    expect(calendarMonths(new Date('2026-10-26T12:00:00Z'), [-2, -1, 0, 1, 2, 3])).toEqual([
      '2026-08',
      '2026-09',
      '2026-10',
      '2026-11',
      '2026-12',
      '2027-01',
    ]);
    expect(calendarMonths(new Date('2027-01-01T00:00:00Z'), [-2, -1, 0])).toEqual([
      '2026-11',
      '2026-12',
      '2027-01',
    ]);
    expect(calendarMonths(new Date('2026-09-30T23:30:00Z'), [0])).toEqual(['2026-10']);
  });

  it.each(['mens', 'womens'])(
    'fetches six months once and separates %s results/fixtures without duplicates',
    async (team) => {
      const session = new ScrapeSession(vi.fn());
      const fetch = vi
        .spyOn(session, 'html')
        .mockImplementation(async (source) => calendar(new URL(source).searchParams.get('month')!));
      const reports = await scrapeMatchCalendar(session, team, new Date('2026-10-26T12:00:00Z'));
      expect(fetch).toHaveBeenCalledTimes(6);
      expect(fetch.mock.calls.map(([source]) => new URL(source).searchParams.get('month'))).toEqual(
        ['2026-08', '2026-09', '2026-10', '2026-11', '2026-12', '2027-01'],
      );
      const fixtures = session.pages.find((page) => page.path.endsWith('fixtures.md'))!.markdown;
      const results = session.pages.find((page) => page.path.endsWith('results.md'))!.markdown;
      expect(fixtures.match(/## United v Opponent/g)).toHaveLength(4);
      expect(results.match(/## United v Opponent/g)).toHaveLength(3);
      expect(fixtures).toContain('Date: 2027-01-28');
      expect(fixtures).not.toMatch(/Date: 2026-0[89]|Score:/);
      expect(results).toContain('Date: 2026-08-01');
      expect(results).not.toContain('PreMatch');
      expect(reports).toHaveLength(3);
    },
  );

  it('retains the previous aggregate when a required month fails but saves the unaffected window', async () => {
    const error = vi.fn();
    const session = new ScrapeSession(error);
    vi.spyOn(session, 'html').mockImplementation(async (source) => {
      const month = new URL(source).searchParams.get('month')!;
      if (month === '2026-11') throw new Error('Unavailable');
      return calendar(month);
    });
    await scrapeMatchCalendar(session, 'mens', new Date('2026-10-26T12:00:00Z'));
    expect(error).toHaveBeenCalledTimes(1);
    expect(session.pages.map((page) => page.path)).toEqual(['matches/mens-results.md']);
  });

  it('accepts an empty real calendar but rejects a loading/error page', async () => {
    const error = vi.fn();
    const session = new ScrapeSession(error);
    const fetch = vi
      .spyOn(session, 'html')
      .mockResolvedValue(
        flight(element({ className: 'fixturesResultsTemplate_calendar', children: [] })),
      );
    await scrapeMatchCalendar(session, 'womens', new Date('2026-10-26T12:00:00Z'));
    expect(session.pages).toHaveLength(2);
    expect(session.pages[0].markdown).toContain('No fixtures published');
    fetch.mockResolvedValue('<main>Loading</main>');
    const previousCount = session.pages.length;
    await scrapeMatchCalendar(session, 'womens', new Date('2026-10-26T12:00:00Z'));
    expect(session.pages).toHaveLength(previousCount);
    expect(error).toHaveBeenCalledTimes(6);
  });
});
