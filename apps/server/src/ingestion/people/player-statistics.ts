import { HttpFetchError } from '../fetch-page';
import { clean, isObject, JsonObject, nextRecords, walk } from '../utils/next-data';
import { ScrapeSession } from '../utils/scrape-session';

const API = 'https://mufc-prd.stadion.io/statsperform/football';
type StatField = [label: string, field: string, percent?: boolean];

// Explicit mappings follow the official profile cards. Several percentages have
// different API names from their labels; they must not be mistaken for counts.
const KEY_STATS: StatField[] = [
  ['Appearances', 'appearances'], ['Goals', 'goals'], ['Assists', 'assists'],
  ['Starts', 'gamesPlayed'], ['Minutes Played', 'minutesPlayed'], ['Yellow Cards', 'yellowCards'], ['Red Cards', 'redCards'],
];
const SHOOTING: StatField[] = [
  ['Total Shots', 'totalShots'], ['Shots on Target', 'shotsOnTarget'], ['Shooting Accuracy', 'shootingAccuracy', true],
  ['Goals inside the box', 'goalsFromInsideBox'], ['Goals outside the box', 'goalsFromOutsideBox'], ['Penalty goals', 'penaltyGoals'],
];
const GOALKEEPING: StatField[] = [
  ['Total Saves', 'saves'], ['Saves inside the box', 'savesMadeInsideBox'], ['Saves outside the box', 'savesOutsideBox'],
  ['Saves Caught', 'savesMadeCaught'], ['Saves Parried', 'savesMadeParried'],
  ['Penalties Faced', 'penaltiesFaced'], ['Penalties Saved', 'penaltiesSaved'], ['Goals Conceded', 'goalsConceded'],
];
const POSSESSION: StatField[] = [
  ['Total Passes', 'totalPasses'], ['Successful Passes', 'successfulPasses'], ['Passing Accuracy', 'passingAccuracy', true],
  ['Passes In Final Third', 'successfulPassesOppositionHalfPercent', true], ['Chances Created', 'keyPasses'],
  ['Through Balls', 'throughBalls'], ['Successful Long Balls', 'successfulLongPassesPercent', true], ['Successful Crosses', 'crossingAccuracy', true],
];
const DEFENDING: StatField[] = [
  ['Tackles Won', 'tacklesWonPercent', true], ['Duels Won', 'duelsWonPercent', true], ['Aerial Duels Won', 'aerialDuelsWonPercent', true],
  ['Clearances Off Line', 'clearancesOffTheLine'], ['Interceptions', 'interceptions'], ['Recoveries', 'recoveries'],
  ['Blocked Shots', 'blockedShots'], ['Fouls Committed', 'foulsCommitted'],
];

/** Preserve real zeroes but never turn absent/null API values into invented statistics. */
function numeric(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Render available fields once per scope (career totals and season cards differ). */
function section(title: string, data: JsonObject, fields: StatField[]): string {
  const lines = fields.flatMap(([label, field, percent]) => numeric(data[field])
    ? [`- ${label}: ${percent ? `${Math.round(data[field])}%` : data[field].toLocaleString('en-GB')}`] : []);
  return lines.length ? `## ${title}\n\n${lines.join('\n')}` : '';
}

/** Match the club's outfield/goalkeeper career cards, without unrelated response fields. */
export function careerMarkdown(data: unknown, goalkeeper: boolean): string {
  if (!isObject(data)) return '';
  return section('United Career', data, [
    ['Appearances', 'appearances'], ['Minutes Played', 'minutesPlayed'],
    ...(goalkeeper ? [['Clean Sheets', 'cleanSheets'], ['Saves', 'saves']] : [['Goals', 'goals'], ['Assists', 'assists']]) as StatField[],
  ]);
}

/** Reproduce the current profile's detailed cards, deriving only values the UI derives. */
export function detailedStatsMarkdown(value: unknown, position: string): string {
  if (!isObject(value)) return '';
  const data = { ...value };
  if (numeric(data.saves) && numeric(data.savesMadeInsideBox)) data.savesOutsideBox = data.saves - data.savesMadeInsideBox;
  if (numeric(data.totalPasses) && numeric(data.passingAccuracy)) data.successfulPasses = Math.round(data.totalPasses * data.passingAccuracy / 100);
  const keyStats = [...KEY_STATS];
  if (['goalkeeper', 'defender'].includes(position)) keyStats.push(['Clean Sheets', 'cleanSheets']);
  return [section('Key Stats', data, keyStats),
    position === 'goalkeeper' ? section('Goalkeeping', data, GOALKEEPING) : section('Shooting', data, SHOOTING),
    section('Possession', data, POSSESSION), section('Defending', data, DEFENDING),
  ].filter(Boolean).join('\n\n');
}

/** Read only component configurations, not unrelated article/image player references. */
export function playerStatsRequests(html: string): { source: string; career: boolean; position: string; goalkeeper: boolean }[] {
  const requests = new Map<string, { source: string; career: boolean; position: string; goalkeeper: boolean }>();
  for (const record of nextRecords(html)) for (const config of walk(record)) {
    if (typeof config.playerId !== 'string' || !isObject(config.dictionary)) continue;
    const career = config.testId === 'profile-hero__stats';
    const team = career ? config.clubId : config.teamId;
    if (typeof team !== 'string' || (!career && typeof config.position !== 'string')) continue;
    const url = new URL(career ? `${API}/player/${encodeURIComponent(config.playerId)}/career/club` : `${API}/stats/player/detailed`);
    if (career) {
      url.searchParams.set('clubId', team);
      url.searchParams.set('goalkeeper', String(config.isGoalkeeper === true));
      url.searchParams.set('includeFriendlies', 'false');
    } else {
      url.searchParams.set('playerId', config.playerId);
      url.searchParams.set('teamId', team);
    }
    requests.set(url.toString(), { source: url.toString(), career, position: clean(config.position), goalkeeper: config.isGoalkeeper === true });
  }
  return [...requests.values()].sort((left, right) => Number(right.career) - Number(left.career));
}

/** Fetch optional statistics independently so a missing feed does not discard a biography. */
export async function fetchPlayerStatistics(session: ScrapeSession, html: string, destination: string): Promise<string> {
  const sections: string[] = [];
  for (const request of playerStatsRequests(html)) {
    try {
      const data = await session.json(request.source, destination);
      const markdown = request.career ? careerMarkdown(data, request.goalkeeper) : detailedStatsMarkdown(data, request.position);
      if (markdown) sections.push(`${request.career ? '' : 'Current season statistics as published on the profile.\n\n'}${markdown}\n\n- Statistics source: [Official ${request.career ? 'career' : 'profile'} feed](${request.source})`);
      else session.logger.log(`No statistics published: ${request.source} -> ${destination}`);
    } catch (error) {
      // The official UI hides 404 feeds for players without coverage. Other failures remain visible in the run log.
      if (error instanceof HttpFetchError && error.status === 404) session.logger.log(`No statistics published: ${request.source} -> ${destination}`);
      else session.reportError(`${request.source}: ${String(error)}`);
    }
  }
  return sections.join('\n\n');
}
