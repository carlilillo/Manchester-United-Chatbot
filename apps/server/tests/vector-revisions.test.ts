import { describe, expect, it, vi } from 'vitest';
import { Document } from '@langchain/core/documents';
import { VectorService } from '../src/vector/vector.service';

vi.mock('../src/config/env', () => ({ env: () => ({ DATABASE_SCHEMA: 'public' }) }));

function setup() {
  const addDocuments = vi.fn().mockResolvedValue(undefined);
  const metadata = {
    publishKnowledge: vi.fn().mockResolvedValue(undefined),
    discardKnowledge: vi.fn().mockResolvedValue(undefined),
  };
  const service = Object.create(VectorService.prototype) as VectorService;
  Object.assign(service, {
    metadata,
    knowledge: { addDocuments },
    initialize: vi.fn().mockResolvedValue(undefined),
  });
  return { service, metadata, addDocuments };
}

describe('bulk knowledge revisions', () => {
  it('passes chunks from multiple sources to one vector-store call', async () => {
    const { service, addDocuments } = setup();
    const documents = ['first', 'second'].map(
      (path) =>
        new Document({
          pageContent: path,
          metadata: { path, revision: 'revision', active: false },
        }),
    );
    await service.stageKnowledgeBatch(documents);
    expect(addDocuments).toHaveBeenCalledExactlyOnceWith(documents);
  });

  it('propagates publication failures so the workflow can discard its staged revision', async () => {
    const { service, metadata } = setup();
    metadata.publishKnowledge.mockRejectedValueOnce(new Error('Publication failed'));
    await expect(service.publishKnowledgeRevision('revision')).rejects.toThrow(
      'Publication failed',
    );
  });

  it('delegates failed-revision cleanup to the metadata repository', async () => {
    const { service, metadata } = setup();
    await service.discardKnowledgeRevision('failed-revision');
    expect(metadata.discardKnowledge).toHaveBeenCalledWith('failed-revision');
  });

  it('releases both PGVectorStore clients before closing their shared pool', async () => {
    const events: string[] = [];
    const service = Object.create(VectorService.prototype) as VectorService;
    Object.assign(service, {
      knowledge: { client: { release: () => events.push('knowledge') } },
      memory: { client: { release: () => events.push('memory') } },
      pool: {
        end: async () => {
          events.push('pool');
        },
      },
    });
    await service.onModuleDestroy();
    expect(events).toEqual(['knowledge', 'memory', 'pool']);
  });
});
