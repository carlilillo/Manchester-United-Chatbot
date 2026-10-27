import { describe, expect, it, vi } from 'vitest';
import { Document } from '@langchain/core/documents';
import { VectorService } from '../src/vector/vector.service';

vi.mock('../src/config/env', () => ({ env: () => ({ DATABASE_SCHEMA: 'public' }) }));

function setup() {
  const query = vi.fn().mockResolvedValue({ rows: [] });
  const release = vi.fn();
  const addDocuments = vi.fn().mockResolvedValue(undefined);
  const remove = vi.fn().mockResolvedValue(undefined);
  const service = Object.create(VectorService.prototype) as VectorService;
  Object.assign(service, {
    pool: { connect: async () => ({ query, release }) },
    knowledge: { addDocuments, delete: remove },
    initialize: vi.fn().mockResolvedValue(undefined),
  });
  return { service, query, release, addDocuments, remove };
}

describe('bulk knowledge revisions', () => {
  it('passes chunks from multiple sources to one vector-store call', async () => {
    const { service, addDocuments } = setup();
    const documents = ['first', 'second'].map(path => new Document({
      pageContent: path, metadata: { path, revision: 'revision', active: false },
    }));
    await service.stageKnowledgeBatch(documents);
    expect(addDocuments).toHaveBeenCalledExactlyOnceWith(documents);
  });

  it('switches the complete index and source revisions in one transaction', async () => {
    const { service, query, release } = setup();
    await service.publishKnowledgeRevision('new-revision');
    const statements = query.mock.calls.map(([sql]) => String(sql));
    expect(statements[0]).toBe('BEGIN');
    expect(statements[1]).toContain("WHERE metadata->>'active'='true'");
    expect(statements[2]).toContain("WHERE metadata->>'revision'=$1");
    expect(query.mock.calls[2][1]).toEqual(['new-revision']);
    expect(statements[3]).toContain('UPDATE "public"."source_documents" SET "activeRevision"=$1');
    expect(statements[4]).toBe('COMMIT');
    expect(release).toHaveBeenCalledOnce();
  });

  it('rolls back publication if updating source revisions fails', async () => {
    const { service, query, release } = setup();
    query.mockImplementation(async sql => {
      if (sql.includes('source_documents')) throw new Error('Publication failed');
      return { rows: [] };
    });
    await expect(service.publishKnowledgeRevision('new-revision')).rejects.toThrow('Publication failed');
    expect(query).toHaveBeenCalledWith('ROLLBACK');
    expect(query).not.toHaveBeenCalledWith('COMMIT');
    expect(release).toHaveBeenCalledOnce();
  });

  it('limits failed-revision cleanup to inactive chunks', async () => {
    const { service, remove } = setup();
    await service.discardKnowledgeRevision('failed-revision');
    expect(remove).toHaveBeenCalledWith({ filter: { revision: 'failed-revision', active: false } });
  });

  it('releases both PGVectorStore clients before closing their shared pool', async () => {
    const events: string[] = [];
    const service = Object.create(VectorService.prototype) as VectorService;
    Object.assign(service, {
      knowledge: { client: { release: () => events.push('knowledge') } },
      memory: { client: { release: () => events.push('memory') } },
      pool: { end: async () => { events.push('pool'); } },
    });
    await service.onModuleDestroy();
    expect(events).toEqual(['knowledge', 'memory', 'pool']);
  });
});
