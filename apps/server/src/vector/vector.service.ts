import { ConflictException, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { createEmbeddingModel } from '../agent/model/embedding-model';
import { PGVectorStore } from '@langchain/pgvector';
import { Document } from '@langchain/core/documents';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import type { Memory, MemoryInput } from '@united/contracts';
import { env } from '../config/env';
import { VectorMetadataRepository } from './vector-metadata.repository';
import { KNOWLEDGE_TABLE, MEMORY_TABLE } from './vector.constants';
import { memoryFromMetadata } from './utils/memory';

/** Owns embedding/search adapters and coordinates repository-backed revision publication. */
@Injectable()
export class VectorService implements OnModuleDestroy {
  readonly pool = new Pool({ connectionString: env().DATABASE_ASYNC_URL });
  readonly embeddings = createEmbeddingModel();
  knowledge!: PGVectorStore;
  memory!: PGVectorStore;
  private initialized?: Promise<void>;
  private readonly logger = new Logger(VectorService.name);

  constructor(private readonly metadata: VectorMetadataRepository) {}

  /** Initialize the library-owned vector tables once for this process. */
  async initialize(): Promise<void> {
    this.initialized ??= (async () => {
      this.knowledge = await PGVectorStore.initialize(this.embeddings, {
        pool: this.pool,
        schemaName: env().DATABASE_SCHEMA,
        tableName: KNOWLEDGE_TABLE,
        dimensions: 3072,
        distanceStrategy: 'cosine',
      });
      this.memory = await PGVectorStore.initialize(this.embeddings, {
        pool: this.pool,
        schemaName: env().DATABASE_SCHEMA,
        tableName: MEMORY_TABLE,
        dimensions: 3072,
        distanceStrategy: 'cosine',
      });
    })();
    return this.initialized;
  }

  /** Search only the published knowledge revision, optionally within one source topic. */
  async searchKnowledge(query: string, type?: string) {
    await this.initialize();
    return this.knowledge.similaritySearchWithScore(
      query,
      8,
      type ? { active: true, type } : { active: true },
    );
  }

  /** Read the visitor's latest published response preferences. */
  async getMemory(userId: string): Promise<Memory> {
    await this.initialize();
    const metadata = await this.metadata.getMemory(userId);
    return memoryFromMetadata(metadata ? { ...metadata } : undefined);
  }

  /** Stage through PGVectorStore, then switch the active revision atomically. */
  async saveMemory(userId: string, input: MemoryInput): Promise<Memory> {
    await this.initialize();
    const current = await this.getMemory(userId);
    if (current.version !== input.version)
      throw new ConflictException('Memory changed in another tab');
    const revision = randomUUID();
    const updatedAt = new Date().toISOString();
    const text = `Response style: ${input.responseStyle}. Additional instructions: ${input.notes || 'None'}`;
    await this.memory.addDocuments([
      new Document({
        pageContent: text,
        metadata: {
          userId,
          active: false,
          revision,
          version: current.version + 1,
          enabled: input.enabled,
          responseStyle: input.responseStyle,
          notes: input.notes,
          updatedAt,
        },
      }),
    ]);
    try {
      await this.metadata.publishMemory(userId, revision, input.version);
    } catch (error) {
      await this.metadata.discardMemory(userId, revision).catch((cleanupError) => {
        this.logger.warn(`Could not discard memory revision ${revision}: ${String(cleanupError)}`);
      });
      throw error;
    }
    return { ...input, version: input.version + 1, updatedAt };
  }

  /** Load preferences through the vector store for the agent's runtime context. */
  async runtimeMemory(userId: string): Promise<Memory> {
    await this.initialize();
    const found = await this.memory.similaritySearch('Response style and answer preferences', 1, {
      userId,
      active: true,
    });
    const m = found[0]?.metadata;
    return memoryFromMetadata(m);
  }

  /** Embed and store a batch of chunks as an unpublished revision. */
  async stageKnowledgeBatch(documents: Document[]): Promise<void> {
    await this.initialize();
    if (documents.length) await this.knowledge.addDocuments(documents);
  }

  /** Publish the complete rebuild atomically; callers hold the document workflow lock. */
  async publishKnowledgeRevision(revision: string): Promise<void> {
    await this.metadata.publishKnowledge(revision);
  }

  /** Remove only unpublished chunks after a failed rebuild, never the active index. */
  async discardKnowledgeRevision(revision: string): Promise<void> {
    await this.metadata.discardKnowledge(revision);
  }

  /** Reclaim old revisions after successful publication. */
  async deleteInactiveKnowledge(): Promise<void> {
    await this.metadata.deleteInactiveKnowledge();
  }

  /** Release dedicated vector-store clients before shutting down their shared pool. */
  async onModuleDestroy() {
    // PGVectorStore.initialize checks out a dedicated client from the supplied pool.
    // Release both before ending the shared pool, or Nest shutdown will wait forever.
    this.knowledge?.client?.release();
    this.memory?.client?.release();
    await this.pool.end();
  }
}
