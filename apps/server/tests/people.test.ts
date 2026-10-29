import { afterEach, describe, expect, it, vi } from 'vitest';
import { Logger } from '@nestjs/common';
import {
  peopleItems,
  peopleListingMarkdown,
  profileMarkdown,
} from '../src/ingestion/people/profile-content';
import {
  careerMarkdown,
  detailedStatsMarkdown,
  playerStatsRequests,
  fetchPlayerStatistics,
} from '../src/ingestion/people/player-statistics';
import { ScrapeSession } from '../src/ingestion/utils/scrape-session';
import { HttpFetchError } from '../src/ingestion/utils/fetch-page';

const source = 'https://www.manutd.com/en/teams/womens-team';
const flight = (value: unknown) =>
  `<script>self.__next_f.push(${JSON.stringify([1, `0:${JSON.stringify(value)}\n`])})</script>`;
const configs = [
  {
    playerId: 'player',
    clubId: 'club',
    dictionary: {},
    testId: 'profile-hero__stats',
    isGoalkeeper: false,
  },
  { playerId: 'player', teamId: 'club', dictionary: {}, position: 'midfielder' },
];
afterEach(() => vi.restoreAllMocks());

describe('people content', () => {
  it('reads squad cards, deduplicates responsive copies and groups by position', () => {
    const card = `<div data-testid="profile-card"><a href="${source}/ella-toone"><img src="/ella.jpg"/>
      <span data-testid="profile-card__first-name">Ella</span><span data-testid="profile-card__last-name">Toone</span>
      <span data-testid="profile-card__squad-number">7</span></a></div>`;
    const html = `<main><div class="profileListings_profileListings__abc"><h2>Midfielders</h2>${card}${card}</div>
      <section><h2>Related Content</h2><a href="${source}/unrelated">Related player</a></section></main>`;
    const people = peopleItems(html, source, 'women');
    expect(people).toEqual([
      {
        name: 'Ella Toone',
        source: `${source}/ella-toone`,
        number: '7',
        position: 'Midfielders',
        image: 'https://www.manutd.com/ella.jpg',
      },
    ]);
    const md = peopleListingMarkdown(people, 'women');
    expect(md).toContain('## Midfielders');
    expect(md.match(/Ella Toone/g)).toHaveLength(1);
    expect(md).not.toContain('Related');
  });

  it('reads known-as names and staff roles only from genuine cards', () => {
    const player = peopleItems(
      `<div data-testid="profile-card"><a href="${source}/amad"><span data-testid="profile-card__known-as">Amad</span></a></div>`,
      source,
      'women',
    );
    expect(player[0].name).toBe('Amad');
    const staffSource = 'https://www.manutd.com/en/man-utd-head-coach-and-staff';
    const staff = peopleItems(
      `<a href="${staffSource}/carrick">Navigation</a><a class="gatewayCard_link__a" href="${staffSource}/carrick"><img src="/coach.jpg"/><h5>Michael Carrick</h5><span data-testid="gateway-card__sub-title">Head Coach</span></a>`,
      staffSource,
      'staff',
    );
    expect(staff).toHaveLength(1);
    expect(peopleListingMarkdown(staff, 'staff')).toContain('- Role: Head Coach');
    expect(() => peopleListingMarkdown([], 'men')).toThrow('No men profile cards');
  });

  it('keeps bio cards and biography once while dropping related content and navigation', () => {
    const person = { name: 'Ella Toone', source: `${source}/ella-toone`, number: '7' };
    const md = profileMarkdown(
      `<main><div data-testid="profile-hero"><span data-testid="profile-hero__squad-number">7</span><span data-testid="profile-hero__position">Midfielder</span></div>
      <div data-testid="key-bio-highlights__stat--0"><span data-testid="basic-stat-title">Date of Birth</span><span data-testid="basic-stat-information">2 September 1999</span></div>
      <div class="profileBio_content__abc"><p>A United biography with <strong>rich text</strong>.</p><p>A United biography with <strong>rich text</strong>.</p></div>
      <section><h2>Related Content</h2><p>Some news article</p></section><nav>Next Player</nav></main>`,
      person,
      'women',
    );
    expect(md.match(/Number: 7/g)).toHaveLength(1);
    expect(md.match(/A United biography/g)).toHaveLength(1);
    expect(md).toContain('Date of Birth: 2 September 1999');
    expect(md).not.toMatch(/Related|Some news|Next Player/);
  });

  it('retains staff descriptions from nested editorial blocks without duplicating paragraphs', () => {
    const md = profileMarkdown(
      '<main><div class="v3-textBlock-module__content"><p>Appointment announcement.</p><article class="_richTextRenderer_abc"><p>Full coaching biography.</p></article></div><section><h2>Related Content</h2><article class="_richTextRenderer_abc"><p>News</p></article></section></main>',
      { name: 'Coach', role: 'Head Coach', source },
      'staff',
    );
    expect(md.match(/Full coaching biography/g)).toHaveLength(1);
    expect(md).toContain('Appointment announcement.');
    expect(md).not.toContain('News');
    expect(() =>
      profileMarkdown('<main>Loading</main>', { name: 'Coach', source }, 'staff'),
    ).toThrow('No biography');
  });
});

describe('profile statistics', () => {
  it('uses the embedded player/team IDs and deduplicates requests', () => {
    const requests = playerStatsRequests(
      flight([...configs, ...configs, { playerId: 'unrelated' }]),
    );
    expect(requests).toHaveLength(2);
    expect(requests[0].source).toContain(
      '/player/player/career/club?clubId=club&goalkeeper=false&includeFriendlies=false',
    );
    expect(requests[1].source).toContain('/stats/player/detailed?playerId=player&teamId=club');
  });

  it('preserves zeroes, omits nulls, and keeps career totals distinct from current cards', () => {
    expect(
      careerMarkdown({ appearances: 100, goals: 0, assists: null, yellowCards: 8 }, false),
    ).toBe('## United Career\n\n- Appearances: 100\n- Goals: 0');
    const md = detailedStatsMarkdown(
      {
        appearances: 7,
        totalShots: 0,
        goals: null,
        totalPasses: 100,
        passingAccuracy: 80,
        duelsWon: 10,
        duelsWonPercent: 65.4,
        keyPasses: 3,
      },
      'midfielder',
    );
    expect(md).toContain('Appearances: 7');
    expect(md).toContain('Total Shots: 0');
    expect(md).toContain('Successful Passes: 80');
    expect(md).toContain('Duels Won: 65%');
    expect(md).not.toMatch(/Goals:|Duels Won: 10|null|undefined/);
    expect(detailedStatsMarkdown({}, 'midfielder')).toBe('');
  });

  it('uses goalkeeper cards and derives saves outside the box only with both operands', () => {
    const md = detailedStatsMarkdown(
      { saves: 10, savesMadeInsideBox: 7, cleanSheets: 0 },
      'goalkeeper',
    );
    expect(md).toContain('## Goalkeeping');
    expect(md).toContain('Saves outside the box: 3');
    expect(md).toContain('Clean Sheets: 0');
    expect(md).not.toContain('## Shooting');
    expect(detailedStatsMarkdown({ saves: 10 }, 'goalkeeper')).not.toContain('Saves outside');
  });

  it('isolates unavailable feeds and reports non-404 failures', async () => {
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const error = vi.fn();
    const session = new ScrapeSession(error);
    const json = vi
      .spyOn(session, 'json')
      .mockRejectedValueOnce(new HttpFetchError(404, 'career'))
      .mockResolvedValueOnce({ appearances: 7 });
    const result = await fetchPlayerStatistics(session, flight(configs), 'people/women/toone.md');
    expect(result).toContain('Appearances: 7');
    expect(error).not.toHaveBeenCalled();
    json.mockRejectedValue(new Error('Unavailable'));
    expect(await fetchPlayerStatistics(session, flight(configs), 'people/women/toone.md')).toBe('');
    expect(error).toHaveBeenCalledTimes(2);
  });
});
