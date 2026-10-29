import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger } from '@nestjs/common';
import { VectorizationService } from '../src/vector/vectorization.service';
import type { SourceDocumentEntity } from '../src/entities/source-document.entity';

vi.mock('../src/vector/vector.service', () => ({ VectorService: class {} }));
vi.mock('../src/config/env', () => ({ env: () => ({}) }));

const source = (id: number, markdown = `Story ${id}`) =>
  ({
    id: String(id),
    path: `news/${id}.md`,
    source: `https://www.manutd.com/en/news/${id}`,
    type: 'news',
    contentHash: `hash-${id}`,
    markdown,
  }) as SourceDocumentEntity;

function setup(sourceBatches: SourceDocumentEntity[][] = [[source(1), source(2)]]) {
  const runner = {
    connect: vi.fn(),
    query: vi.fn().mockResolvedValue([{ acquired: true }]),
    release: vi.fn(),
  };
  const documents = {
    readBatches: vi.fn(async function* () {
      yield* sourceBatches;
    }),
  };
  const vectors = {
    initialize: vi.fn().mockResolvedValue(undefined),
    stageKnowledgeBatch: vi.fn().mockResolvedValue(undefined),
    publishKnowledgeRevision: vi.fn().mockResolvedValue(undefined),
    discardKnowledgeRevision: vi.fn().mockResolvedValue(undefined),
    deleteInactiveKnowledge: vi.fn().mockResolvedValue(undefined),
  };
  const service = new VectorizationService(
    { createQueryRunner: () => runner } as never,
    documents as never,
    vectors as never,
  );
  return { service, documents, vectors, runner };
}

beforeEach(() => {
  for (const method of ['log', 'warn', 'error'] as const) {
    vi.spyOn(Logger.prototype, method).mockImplementation(() => undefined);
  }
});
afterEach(() => vi.restoreAllMocks());

describe('independent database vectorization', () => {
  it('embeds multiple database documents together and publishes after all batches finish', async () => {
    const { service, vectors } = setup([[source(1), source(2)], [source(3)]]);
    const events: string[] = [];
    vectors.stageKnowledgeBatch.mockImplementation(async () => {
      events.push('stage');
    });
    vectors.publishKnowledgeRevision.mockImplementation(async () => {
      events.push('publish');
    });
    vectors.deleteInactiveKnowledge.mockImplementation(async () => {
      events.push('cleanup');
    });

    const result = await service.run();
    expect(result).toMatchObject({ status: 'completed', documents: 3, chunks: 3 });
    expect(vectors.stageKnowledgeBatch).toHaveBeenCalledTimes(2);
    expect(
      vectors.stageKnowledgeBatch.mock.calls[0][0].map(
        (chunk: { pageContent: string }) => chunk.pageContent,
      ),
    ).toEqual(['Story 1', 'Story 2']);
    expect(events).toEqual(['stage', 'stage', 'publish', 'cleanup']);
    expect(vectors.discardKnowledgeRevision).not.toHaveBeenCalled();
  });

  it('bounds vector writes to 128 chunks instead of writing per source document', async () => {
    const sources = Array.from({ length: 100 }, (_, index) =>
      source(index, `# Heading ${index}\n${'United football. '.repeat(200)}`),
    );
    const { service, vectors } = setup([sources]);
    const result = await service.run();
    expect(result).toMatchObject({ status: 'completed', documents: 100 });
    const batches = vectors.stageKnowledgeBatch.mock.calls.map(([batch]) => batch);
    expect(batches[0]).toHaveLength(128);
    expect(batches.every((batch) => batch.length <= 128)).toBe(true);
    expect(
      new Set(
        batches[0].map(
          (chunk: { metadata: { sourceDocumentId: string } }) => chunk.metadata.sourceDocumentId,
        ),
      ).size,
    ).toBeGreaterThan(1);
  });

  it('cleans up failed staging without publishing or deleting the active index', async () => {
    const { service, vectors, runner } = setup([[source(1)], [source(2)]]);
    vectors.stageKnowledgeBatch
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Embedding failed'));
    await expect(service.run()).rejects.toThrow('Embedding failed');
    expect(vectors.publishKnowledgeRevision).not.toHaveBeenCalled();
    expect(vectors.deleteInactiveKnowledge).not.toHaveBeenCalled();
    expect(vectors.discardKnowledgeRevision).toHaveBeenCalledOnce();
    expect(runner.query).toHaveBeenCalledWith('SELECT pg_advisory_unlock($1)', [77631142]);
    expect(runner.release).toHaveBeenCalledOnce();
  });

  it('discards unpublished chunks if publication fails', async () => {
    const { service, vectors } = setup();
    vectors.publishKnowledgeRevision.mockRejectedValueOnce(new Error('Database unavailable'));
    await expect(service.run()).rejects.toThrow('Database unavailable');
    expect(vectors.discardKnowledgeRevision).toHaveBeenCalledOnce();
    expect(vectors.deleteInactiveKnowledge).not.toHaveBeenCalled();
  });

  it('reports success with a warning if old-vector cleanup fails after publication', async () => {
    const { service, vectors } = setup();
    vectors.deleteInactiveKnowledge.mockRejectedValueOnce(new Error('Cleanup failed'));
    await expect(service.run()).resolves.toMatchObject({ status: 'completed' });
    expect(vectors.discardKnowledgeRevision).not.toHaveBeenCalled();
    expect(Logger.prototype.warn).toHaveBeenCalledWith(expect.stringContaining('Index published'));
  });

  it('does not initialize embeddings or replace the index when the source table is empty', async () => {
    const { service, vectors } = setup([]);
    await expect(service.run()).resolves.toEqual({ status: 'empty', documents: 0, chunks: 0 });
    expect(vectors.initialize).not.toHaveBeenCalled();
    expect(vectors.publishKnowledgeRevision).not.toHaveBeenCalled();
    expect(vectors.deleteInactiveKnowledge).not.toHaveBeenCalled();
  });

  it('does not read sources if ingestion or another rebuild holds the workflow lock', async () => {
    const { service, documents, runner } = setup();
    runner.query.mockResolvedValueOnce([{ acquired: false }]);
    await expect(service.run()).resolves.toEqual({ status: 'already-running' });
    expect(documents.readBatches).not.toHaveBeenCalled();
    expect(runner.release).toHaveBeenCalledOnce();
  });
});
