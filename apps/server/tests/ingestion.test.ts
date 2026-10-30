import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger } from '@nestjs/common';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { IngestionService } from '../src/ingestion/ingestion.service';
import { INGESTION_TOPICS } from '../src/ingestion/schedules';
import { scrapeTopics } from '../src/ingestion/scrapers';

vi.mock('../src/config/env', () => ({ env: () => ({}) }));
vi.mock('../src/ingestion/scrapers', () => ({ scrapeTopics: vi.fn() }));
vi.mock('node:fs/promises', () => ({ mkdir: vi.fn(), writeFile: vi.fn(), rm: vi.fn() }));

const page = {
  path: 'news/articles/united-win.md',
  source: 'https://www.manutd.com/en/news/detail/united-win',
  type: 'news',
  markdown: '# United win\n\nA strong performance from the team.',
};

function setup() {
  const repository = {
    create: vi.fn((value) => value),
    save: vi.fn(async (value) => value),
    findOne: vi.fn(),
  };
  const runner = {
    connect: vi.fn(),
    query: vi.fn().mockResolvedValue([{ acquired: true }]),
    release: vi.fn(),
  };
  const documents = {
    removeObsolete: vi.fn().mockResolvedValue(0),
    saveBatch: vi.fn().mockResolvedValue(undefined),
  };
  const database = { getRepository: () => repository, createQueryRunner: () => runner };
  const service = new IngestionService(database as never, documents as never, repository as never);
  return { service, repository, runner, documents };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(scrapeTopics).mockResolvedValue([page]);
  vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
});
afterEach(() => vi.restoreAllMocks());

describe('source ingestion without embeddings', () => {
  it('upserts the full Markdown in database batches of at most 100', async () => {
    const { service, documents, runner } = setup();
    const pages = Array.from({ length: 101 }, (_, index) => ({
      ...page,
      path: `news/articles/story-${index}.md`,
    }));
    vi.mocked(scrapeTopics).mockResolvedValue(pages);

    await expect(service.run()).resolves.toMatchObject({
      status: 'completed',
      updated: 101,
      failed: 0,
    });
    expect(documents.saveBatch.mock.calls.map(([batch]) => batch.length)).toEqual([100, 1]);
    expect(documents.saveBatch.mock.calls[0][0][0].markdown).toBe(page.markdown);
    expect(runner.query).toHaveBeenCalledWith('SELECT pg_advisory_unlock($1)', [77631142]);
    expect(runner.release).toHaveBeenCalledOnce();
  });

  it('does not write the Markdown archive to the filesystem', async () => {
    const { service } = setup();
    await service.run();
    expect(mkdir).not.toHaveBeenCalled();
    expect(writeFile).not.toHaveBeenCalled();
    expect(rm).not.toHaveBeenCalled();
  });

  it('records a database failure for every page in the batch', async () => {
    const { service, documents } = setup();
    documents.saveBatch.mockRejectedValueOnce(new Error('Database unavailable'));
    await expect(service.run()).resolves.toMatchObject({
      status: 'partial',
      updated: 0,
      failed: 1,
    });
    expect(Logger.prototype.error).toHaveBeenCalledWith(
      expect.stringContaining('Database unavailable'),
    );
  });

  it('scrapes and records every topic by default, or only the requested ones', async () => {
    const { service, repository } = setup();
    await service.run();
    expect(scrapeTopics).toHaveBeenLastCalledWith(INGESTION_TOPICS, expect.any(Function));
    expect(repository.create).toHaveBeenLastCalledWith(
      expect.objectContaining({ topics: [...INGESTION_TOPICS] }),
    );
    await service.run(['matches', 'store']);
    expect(scrapeTopics).toHaveBeenLastCalledWith(['matches', 'store'], expect.any(Function));
    expect(repository.create).toHaveBeenLastCalledWith(
      expect.objectContaining({ topics: ['matches', 'store'] }),
    );
  });

  it('finds the latest successful run that captured all of the given topics', async () => {
    const { service, repository } = setup();
    const startedAt = new Date('2026-10-01T06:00:00Z');
    repository.findOne.mockResolvedValue({ id: 'run', startedAt });
    await expect(service.lastCapturedAt(['matches', 'store'])).resolves.toBe(startedAt);
    const query = repository.findOne.mock.calls[0][0];
    expect(query.where.status.value).toEqual(['completed', 'partial']);
    expect(query.where.topics.type).toBe('arrayContains');
    expect(query.where.topics.value).toEqual(['matches', 'store']);
    expect(query.order).toEqual({ startedAt: 'DESC' });
    repository.findOne.mockResolvedValue(null);
    await expect(service.lastCapturedAt(['travel'])).resolves.toBeUndefined();
  });

  it('logs and records scrape failures while saving successful pages', async () => {
    const { service } = setup();
    const failure = 'https://tickets.manutd.com/memberships: HTTP 403';
    vi.mocked(scrapeTopics).mockImplementation(async (_topics, reportError) => {
      reportError(failure);
      return [page];
    });
    await expect(service.run()).resolves.toMatchObject({
      status: 'partial',
      updated: 1,
      failed: 1,
      errors: [failure],
    });
    expect(Logger.prototype.error).toHaveBeenCalledWith(failure);
  });

  it('releases the workflow lock even if saving the run record fails', async () => {
    const { service, repository, runner } = setup();
    repository.save.mockRejectedValueOnce(new Error('Cannot save run'));
    await expect(service.run()).rejects.toThrow('Cannot save run');
    expect(runner.query).toHaveBeenCalledWith('SELECT pg_advisory_unlock($1)', [77631142]);
    expect(runner.release).toHaveBeenCalledOnce();
  });

  it('skips fetching while another document workflow holds the lock', async () => {
    const { service, runner } = setup();
    runner.query.mockResolvedValueOnce([{ acquired: false }]);
    await expect(service.run()).resolves.toEqual({ status: 'already-running' });
    expect(scrapeTopics).not.toHaveBeenCalled();
    expect(runner.release).toHaveBeenCalledOnce();
  });
});
