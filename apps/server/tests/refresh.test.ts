import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { RefreshService } from '../src/services/refresh.service';
import {
  INGESTION_SCHEDULES,
  INGESTION_TOPICS,
  REFRESH_CRON,
  type IngestionTopic,
} from '../src/ingestion/schedules';

vi.mock('../src/config/env', () => ({ env: () => ({}) }));

const NOW = new Date('2026-10-30T06:00:00Z');
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);
const schedule = (name: string) => INGESTION_SCHEDULES.find((item) => item.name === name)!;

/** Each schedule's last capture time, keyed by its first topic. */
function setup(lastRuns: Partial<Record<IngestionTopic, Date>>) {
  const ingestion = {
    lastCapturedAt: vi.fn(async (topics: IngestionTopic[]) => lastRuns[topics[0]]),
    run: vi.fn().mockResolvedValue({ status: 'completed' }),
  };
  const vectorization = { run: vi.fn().mockResolvedValue({ status: 'completed' }) };
  const scheduler = new SchedulerRegistry();
  const service = new RefreshService(ingestion as never, vectorization as never, scheduler);
  return { service, ingestion, vectorization, scheduler };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('scheduled refresh', () => {
  it('groups every topic into exactly one schedule', () => {
    const topics = INGESTION_SCHEDULES.flatMap((item) => item.topics);
    expect([...topics].sort()).toEqual([...INGESTION_TOPICS].sort());
    expect(
      INGESTION_SCHEDULES.map(({ name, everyDays, topics }) => [name, everyDays, topics]),
    ).toEqual([
      ['daily', 1, ['homepage', 'news', 'videos']],
      ['every-3-days', 3, ['matches', 'store']],
      ['every-30-days', 30, ['membership', 'people']],
      ['every-45-days', 45, ['travel']],
    ]);
  });

  it('registers and starts one morning cron job per frequency', () => {
    const { service, scheduler } = setup({});
    service.onModuleInit();
    const jobs = scheduler.getCronJobs();
    expect([...jobs.keys()]).toEqual([
      'ingest-daily',
      'ingest-every-3-days',
      'ingest-every-30-days',
      'ingest-every-45-days',
    ]);
    for (const job of jobs.values()) {
      expect(job.isActive).toBe(true);
      expect(job.cronTime.source).toBe(REFRESH_CRON);
    }
    for (const name of jobs.keys()) scheduler.deleteCronJob(name);
  });

  it('captures every due schedule in one ingestion and one vectorization', async () => {
    const { service, ingestion, vectorization } = setup({
      homepage: daysAgo(1),
      matches: daysAgo(3),
      membership: daysAgo(12),
      travel: undefined,
    });
    await service.trigger(schedule('daily'));
    expect(ingestion.run).toHaveBeenCalledOnce();
    expect(ingestion.run).toHaveBeenCalledWith([
      'homepage',
      'news',
      'videos',
      'matches',
      'store',
      'travel',
    ]);
    expect(vectorization.run).toHaveBeenCalledOnce();
  });

  it('skips a schedule whose interval has not elapsed, tolerating a slightly late previous run', async () => {
    const { service, ingestion, vectorization } = setup({
      homepage: new Date(NOW.getTime() - 23.5 * 60 * 60 * 1000),
      matches: daysAgo(2),
      membership: daysAgo(29),
      travel: daysAgo(44),
    });
    await service.trigger(schedule('daily'));
    expect(ingestion.run).toHaveBeenCalledWith(['homepage', 'news', 'videos']);
    ingestion.run.mockClear();
    for (const name of ['every-3-days', 'every-30-days', 'every-45-days'])
      await service.trigger(schedule(name));
    expect(ingestion.run).not.toHaveBeenCalled();
    expect(vectorization.run).toHaveBeenCalledOnce();
  });

  it('runs ticks one at a time so a later tick sees the earlier capture', async () => {
    const lastRuns: Partial<Record<IngestionTopic, Date>> = {
      homepage: daysAgo(1),
      matches: daysAgo(3),
      membership: daysAgo(1),
      travel: daysAgo(1),
    };
    const { service, ingestion } = setup(lastRuns);
    ingestion.run.mockImplementation(async (topics: IngestionTopic[]) => {
      for (const topic of topics) lastRuns[topic] = NOW;
      return { status: 'completed' };
    });
    await Promise.all([
      service.trigger(schedule('daily')),
      service.trigger(schedule('every-3-days')),
    ]);
    expect(ingestion.run).toHaveBeenCalledOnce();
  });

  it('skips vectorization when another workflow holds the lock, and logs failures', async () => {
    const { service, ingestion, vectorization } = setup({});
    ingestion.run.mockResolvedValueOnce({ status: 'already-running' });
    await service.trigger(schedule('daily'));
    expect(vectorization.run).not.toHaveBeenCalled();
    ingestion.run.mockRejectedValueOnce(new Error('Database unavailable'));
    await expect(service.trigger(schedule('daily'))).resolves.toBeUndefined();
    expect(Logger.prototype.error).toHaveBeenCalledWith(
      expect.stringContaining('Database unavailable'),
    );
  });
});
