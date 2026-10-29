import { describe, expect, it, vi } from 'vitest';
import { ConflictException } from '@nestjs/common';
import { VectorMetadataRepository } from '../src/vector/vector-metadata.repository';
import { KnowledgeVectorEntity } from '../src/entities/knowledge-vector.entity';
import { MemoryVectorEntity } from '../src/entities/memory-vector.entity';
import { SourceDocumentEntity } from '../src/entities/source-document.entity';
import { UserEntity } from '../src/entities/user.entity';

/** A transaction snapshot makes rollback observable without relying on emitted SQL text. */
function setup() {
  let rows = [
    { id: '1', metadata: { active: true, revision: 'old', path: 'news/old.md' } },
    { id: '2', metadata: { active: false, revision: 'new', path: 'news/new.md' } },
    { id: '3', metadata: { active: false, revision: 'other', path: 'news/other.md' } },
  ];
  let memoryRows = [
    { id: 'old-memory', metadata: { userId: 'user', active: true, revision: 'old', version: 1 } },
    { id: 'new-memory', metadata: { userId: 'user', active: false, revision: 'new', version: 2 } },
    {
      id: 'other-memory',
      metadata: { userId: 'user', active: false, revision: 'other', version: 2 },
    },
  ];
  const matches = (metadata: object, filter: Record<string, unknown>) =>
    Object.entries(filter).every(([key, value]) => metadata[key as keyof object] === value);
  const knowledge = {
    find: vi.fn(async ({ where, take }) =>
      rows
        .filter(
          (row) =>
            matches(row.metadata, where.metadata.value) && (!where.id || row.id > where.id.value),
        )
        .slice(0, take),
    ),
    upsert: vi.fn(async (patches) => {
      for (const patch of patches) Object.assign(rows.find((row) => row.id === patch.id)!, patch);
    }),
    delete: vi.fn(),
  };
  const memories = {
    findBy: vi.fn(async ({ metadata }) =>
      memoryRows.filter((row) => matches(row.metadata, metadata.value)),
    ),
    findOneBy: vi.fn(async ({ metadata }) =>
      memoryRows.find((row) => matches(row.metadata, metadata.value)),
    ),
    update: vi.fn(async (id, patch) =>
      Object.assign(memoryRows.find((row) => row.id === id)!, patch),
    ),
    delete: vi.fn(async ({ id }) => {
      memoryRows = memoryRows.filter((row) => !id.value.includes(row.id));
    }),
  };
  const users = { findOne: vi.fn().mockResolvedValue({ id: 'user' }) };
  const sources = {
    createQueryBuilder: vi.fn(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    execute: vi.fn(),
  };
  sources.createQueryBuilder.mockReturnValue(sources);
  const repositories = new Map<unknown, unknown>([
    [KnowledgeVectorEntity, knowledge],
    [MemoryVectorEntity, memories],
    [UserEntity, users],
    [SourceDocumentEntity, sources],
  ]);
  const transaction = vi.fn(async (work) => {
    const previous = structuredClone(rows);
    const previousMemory = structuredClone(memoryRows);
    try {
      return await work({ getRepository: (entity: unknown) => repositories.get(entity) });
    } catch (error) {
      rows = previous;
      memoryRows = previousMemory;
      throw error;
    }
  });
  const service = new VectorMetadataRepository(
    { ...knowledge, manager: { transaction } } as never,
    { ...memories, manager: { transaction } } as never,
  );
  return {
    service,
    knowledge,
    memories,
    users,
    sources,
    transaction,
    rows: () => rows,
    memoryRows: () => memoryRows,
  };
}

describe('repository-backed publication', () => {
  it('switches only the requested revision and preserves unrelated metadata', async () => {
    const { service, rows, sources, transaction } = setup();
    await service.publishKnowledge('new');
    expect(rows().map((row) => row.metadata.active)).toEqual([false, true, false]);
    expect(rows()[1].metadata.path).toBe('news/new.md');
    expect(sources.set).toHaveBeenCalledWith({ activeRevision: 'new' });
    expect(transaction).toHaveBeenCalledOnce();
  });

  it('publishes large revisions in bounded batches without per-chunk writes', async () => {
    const { service, rows, knowledge } = setup();
    rows().splice(
      0,
      rows().length,
      ...Array.from({ length: 129 }, (_, index) => ({
        id: String(index).padStart(5, '0'),
        metadata: { active: false, revision: 'new', path: `news/${index}.md` },
      })),
    );
    await service.publishKnowledge('new');
    expect(knowledge.upsert.mock.calls.map(([batch]) => batch.length)).toEqual([128, 1]);
    expect(rows().every((row) => row.metadata.active)).toBe(true);
  });

  it('rolls back both old and staged publication states when source pointers fail', async () => {
    const { service, rows, sources } = setup();
    sources.execute.mockRejectedValueOnce(new Error('Source update failed'));
    await expect(service.publishKnowledge('new')).rejects.toThrow('Source update failed');
    expect(rows().map((row) => row.metadata.active)).toEqual([true, false, false]);
  });

  it('locks the visitor and leaves another request’s staged preferences intact', async () => {
    const { service, users, memoryRows } = setup();
    await service.publishMemory('user', 'new', 1);
    expect(users.findOne).toHaveBeenCalledWith({
      where: { id: 'user' },
      lock: { mode: 'pessimistic_write' },
    });
    expect(memoryRows().map((row) => row.id)).toEqual(['new-memory', 'other-memory']);
    expect(memoryRows().map((row) => row.metadata.active)).toEqual([true, false]);
  });

  it('rejects a stale version without changing published or staged memory', async () => {
    const { service, memoryRows, memories } = setup();
    await expect(service.publishMemory('user', 'new', 0)).rejects.toThrow(ConflictException);
    expect(memoryRows()).toHaveLength(3);
    expect(memories.update).not.toHaveBeenCalled();
    expect(memories.delete).not.toHaveBeenCalled();
  });

  it('never deletes active knowledge during a failed revision cleanup', async () => {
    const { service, knowledge } = setup();
    await service.discardKnowledge('failed');
    expect(knowledge.delete.mock.calls[0][0].metadata.value).toEqual({
      revision: 'failed',
      active: false,
    });
  });
});
