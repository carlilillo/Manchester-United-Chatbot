import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, JsonContains, MoreThan, Repository } from 'typeorm';
import { KnowledgeVectorEntity } from '../entities/knowledge-vector.entity';
import { MemoryVectorEntity } from '../entities/memory-vector.entity';
import { SourceDocumentEntity } from '../entities/source-document.entity';
import { UserEntity } from '../entities/user.entity';
import { VECTOR_METADATA_CONNECTION } from './vector.constants';

const PUBLICATION_BATCH_SIZE = 128;

/** Owns revision transactions; all JSON filters and values are bound by TypeORM. */
@Injectable()
export class VectorMetadataRepository {
  constructor(
    @InjectRepository(KnowledgeVectorEntity, VECTOR_METADATA_CONNECTION)
    private readonly knowledge: Repository<KnowledgeVectorEntity>,
    @InjectRepository(MemoryVectorEntity, VECTOR_METADATA_CONNECTION)
    private readonly memories: Repository<MemoryVectorEntity>,
  ) {}

  async getMemory(userId: string) {
    const rows = await this.memories.findBy({ metadata: JsonContains({ userId, active: true }) });
    // Normally only one row is active; retain compatibility with older duplicated revisions.
    return rows.sort((a, b) => b.metadata.version - a.metadata.version)[0]?.metadata;
  }

  /** Lock the visitor before checking the version so two tabs cannot publish the same next version. */
  async publishMemory(userId: string, revision: string, expectedVersion: number): Promise<void> {
    await this.memories.manager.transaction(async (manager) => {
      const user = await manager.getRepository(UserEntity).findOne({
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) throw new NotFoundException('Session not found');

      const repository = manager.getRepository(MemoryVectorEntity);
      const active = await repository.findBy({ metadata: JsonContains({ userId, active: true }) });
      const version = Math.max(0, ...active.map((row) => row.metadata.version));
      if (version !== expectedVersion) throw new ConflictException('Memory changed in another tab');

      const staged = await repository.findOneBy({
        metadata: JsonContains({ userId, revision, active: false }),
      });
      if (!staged) throw new NotFoundException('Staged memory not found');

      await repository.update(staged.id, { metadata: { ...staged.metadata, active: true } });
      // Delete only replaced rows, never another request's unpublished embedding.
      if (active.length) await repository.delete({ id: In(active.map((row) => row.id)) });
    });
  }

  async discardMemory(userId: string, revision: string): Promise<void> {
    await this.memories.delete({ metadata: JsonContains({ userId, revision, active: false }) });
  }

  /** Publish the index and source pointers atomically while the caller holds the workflow lock. */
  async publishKnowledge(revision: string): Promise<void> {
    await this.knowledge.manager.transaction(async (manager) => {
      const repository = manager.getRepository(KnowledgeVectorEntity);
      await this.setKnowledgeActive(repository, { active: true }, false);
      await this.setKnowledgeActive(repository, { revision }, true);
      await manager
        .getRepository(SourceDocumentEntity)
        .createQueryBuilder()
        .update()
        .set({ activeRevision: revision })
        .execute();
    });
  }

  /** Update metadata in bounded batches without reading embeddings or interpolating JSON SQL. */
  private async setKnowledgeActive(
    repository: Repository<KnowledgeVectorEntity>,
    filter: Record<string, unknown>,
    active: boolean,
  ): Promise<void> {
    let lastId: string | undefined;
    while (true) {
      const rows: KnowledgeVectorEntity[] = await repository.find({
        where: { metadata: JsonContains(filter), ...(lastId ? { id: MoreThan(lastId) } : {}) },
        order: { id: 'ASC' },
        take: PUBLICATION_BATCH_SIZE,
      });
      if (!rows.length) return;
      // Embeddings are read-only in the entity; the upsert changes only revision metadata.
      await repository.upsert(
        rows.map((row) => ({ id: row.id, metadata: { ...row.metadata, active } })),
        ['id'],
      );
      lastId = rows[rows.length - 1].id;
    }
  }

  async discardKnowledge(revision: string): Promise<void> {
    await this.knowledge.delete({ metadata: JsonContains({ revision, active: false }) });
  }

  async deleteInactiveKnowledge(): Promise<void> {
    await this.knowledge.delete({ metadata: JsonContains({ active: false }) });
  }
}
