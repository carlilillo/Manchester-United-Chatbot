import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { createEmbeddingModel } from '../agent/model/embedding-model';
import { PGVectorStore } from '@langchain/pgvector';
import { Document } from '@langchain/core/documents';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import type { Memory, MemoryInput } from '@united/contracts';
import { env } from '../config/env';

const DEFAULT_MEMORY: Memory = { enabled: true, responseStyle: 'friendly', notes: '', version: 0, updatedAt: null };
const KNOWLEDGE_TABLE = 'united_knowledge_vectors';
const MEMORY_TABLE = 'united_memory_vectors';
const quote = (identifier: string) => `"${identifier.replaceAll('"', '""')}"`;

/** Owns both official PGVectorStore instances and the small SQL publication boundary. */
@Injectable()
export class VectorService implements OnModuleDestroy {
  readonly pool = new Pool({ connectionString: env().DATABASE_ASYNC_URL });
  readonly embeddings = createEmbeddingModel();
  knowledge!: PGVectorStore;
  memory!: PGVectorStore;
  private initialized?: Promise<void>;
  /** Qualify SQL table names with the configured application schema. */
  private table(name: string) { return `${quote(env().DATABASE_SCHEMA)}.${quote(name)}`; }

  /** Initialize vector stores and lookup indexes once for this process. */
  async initialize(): Promise<void> {
    this.initialized ??= (async () => {
      this.knowledge = await PGVectorStore.initialize(this.embeddings, {
        pool: this.pool, schemaName: env().DATABASE_SCHEMA, tableName: KNOWLEDGE_TABLE,
        dimensions: 3072, distanceStrategy: 'cosine',
      });
      this.memory = await PGVectorStore.initialize(this.embeddings, {
        pool: this.pool, schemaName: env().DATABASE_SCHEMA, tableName: MEMORY_TABLE,
        dimensions: 3072, distanceStrategy: 'cosine',
      });
      const kt = this.table(KNOWLEDGE_TABLE);
      const mt = this.table(MEMORY_TABLE);
      await this.pool.query(`CREATE INDEX IF NOT EXISTS united_knowledge_active_idx ON ${kt} ((metadata->>'active'), (metadata->>'type'))`);
      await this.pool.query(`CREATE INDEX IF NOT EXISTS united_knowledge_path_idx ON ${kt} ((metadata->>'path'), (metadata->>'source'), (metadata->>'type'))`);
      await this.pool.query(`CREATE INDEX IF NOT EXISTS united_memory_user_idx ON ${mt} ((metadata->>'userId'), (metadata->>'active'))`);
    })();
    return this.initialized;
  }

  /** Search only the published knowledge revision, optionally within one source topic. */
  async searchKnowledge(query: string, type?: string) {
    await this.initialize();
    return this.knowledge.similaritySearchWithScore(query, 8, type ? { active: true, type } : { active: true });
  }

  /** Read the visitor's latest published response preferences. */
  async getMemory(userId: string): Promise<Memory> {
    await this.initialize();
    const result = await this.pool.query(
      `SELECT metadata FROM ${this.table(MEMORY_TABLE)} WHERE metadata->>'userId'=$1 AND metadata->>'active'='true' ORDER BY (metadata->>'version')::int DESC LIMIT 1`,
      [userId],
    );
    const m = result.rows[0]?.metadata as Record<string, unknown> | undefined;
    if (!m) return DEFAULT_MEMORY;
    return {
      enabled: Boolean(m.enabled), responseStyle: m.responseStyle as Memory['responseStyle'],
      notes: String(m.notes ?? ''), version: Number(m.version), updatedAt: String(m.updatedAt),
    };
  }

  /** Stage through PGVectorStore, then switch the active revision atomically. */
  async saveMemory(userId: string, input: MemoryInput): Promise<Memory> {
    await this.initialize();
    const current = await this.getMemory(userId);
    if (current.version !== input.version) throw new Error('MEMORY_VERSION_CONFLICT');
    const revision = randomUUID();
    const updatedAt = new Date().toISOString();
    const text = `Response style: ${input.responseStyle}. Additional instructions: ${input.notes || 'None'}`;
    await this.memory.addDocuments([new Document({ pageContent: text, metadata: {
      userId, active: false, revision, version: current.version + 1,
      enabled: input.enabled, responseStyle: input.responseStyle, notes: input.notes, updatedAt,
    } })]);
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SELECT id FROM ${this.table('chat_users')} WHERE id=$1 FOR UPDATE`, [userId]);
      const check = await client.query(`SELECT COALESCE(MAX((metadata->>'version')::int),0) AS version FROM ${this.table(MEMORY_TABLE)} WHERE metadata->>'userId'=$1 AND metadata->>'active'='true'`, [userId]);
      if (Number(check.rows[0].version) !== input.version) throw new Error('MEMORY_VERSION_CONFLICT');
      await client.query(`UPDATE ${this.table(MEMORY_TABLE)} SET metadata=jsonb_set(metadata,'{active}','false'::jsonb) WHERE metadata->>'userId'=$1 AND metadata->>'active'='true'`, [userId]);
      await client.query(`UPDATE ${this.table(MEMORY_TABLE)} SET metadata=jsonb_set(metadata,'{active}','true'::jsonb) WHERE metadata->>'userId'=$1 AND metadata->>'revision'=$2`, [userId, revision]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      await this.memory.delete({ filter: { userId, revision } }).catch(() => undefined);
      throw error;
    } finally { client.release(); }
    await this.memory.delete({ filter: { userId, active: false } });
    return { ...input, version: input.version + 1, updatedAt };
  }

  /** Load preferences through the vector store for the agent's runtime context. */
  async runtimeMemory(userId: string): Promise<Memory> {
    await this.initialize();
    const found = await this.memory.similaritySearch('Response style and answer preferences', 1, { userId, active: true });
    const m = found[0]?.metadata;
    return m ? { enabled: Boolean(m.enabled), responseStyle: m.responseStyle, notes: m.notes, version: Number(m.version), updatedAt: m.updatedAt } : DEFAULT_MEMORY;
  }

  /** Embed and store a batch of chunks as an unpublished revision. */
  async stageKnowledgeBatch(documents: Document[]): Promise<void> {
    await this.initialize();
    if (documents.length) await this.knowledge.addDocuments(documents);
  }

  /** Publish the complete rebuild atomically; callers hold the document workflow lock. */
  async publishKnowledgeRevision(revision: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE ${this.table(KNOWLEDGE_TABLE)}
         SET metadata=jsonb_set(metadata, '{active}', 'false'::jsonb)
         WHERE metadata->>'active'='true'`,
      );
      await client.query(
        `UPDATE ${this.table(KNOWLEDGE_TABLE)}
         SET metadata=jsonb_set(metadata, '{active}', 'true'::jsonb)
         WHERE metadata->>'revision'=$1`,
        [revision],
      );
      await client.query(
        `UPDATE ${this.table('source_documents')} SET "activeRevision"=$1`,
        [revision],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /** Remove only unpublished chunks after a failed rebuild, never the active index. */
  async discardKnowledgeRevision(revision: string): Promise<void> {
    await this.knowledge.delete({ filter: { revision, active: false } });
  }

  /** Reclaim old revisions after successful publication. */
  async deleteInactiveKnowledge(): Promise<void> {
    await this.knowledge.delete({ filter: { active: false } });
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
