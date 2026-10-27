import { Injectable } from '@nestjs/common';
import { DataSource, In, Like, MoreThan, Not } from 'typeorm';
import { SourceDocumentEntity } from '../entities/source-document.entity';
import type { CapturedPage } from './types';
import { contentHash } from './utils/content-hash';
import { isObsoleteCapture, RETIRED_HOMEPAGE_PATHS } from './utils/obsolete-captures';

export const SOURCE_BATCH_SIZE = 100;

/** Stores source text independently of embeddings and serves it to the indexer. */
@Injectable()
export class SourceDocumentService {
  constructor(private readonly database: DataSource) {}

  /** Read complete ingested sources by exact archive path, independently of vectorization. */
  async getByPaths(paths: string[]): Promise<SourceDocumentEntity[]> {
    const uniquePaths = [...new Set(paths)];
    if (!uniquePaths.length) return [];
    return this.database.getRepository(SourceDocumentEntity).find({
      where: { path: In(uniquePaths) },
      order: { path: 'ASC', source: 'ASC' },
    });
  }

  /** Upsert a group by its natural key without changing the published vector revision. */
  async saveBatch(pages: CapturedPage[]): Promise<void> {
    if (!pages.length) return;
    const documents = pages.map(page => ({ ...page, contentHash: contentHash(page.markdown) }));
    const replacedSources = pages.filter(page => ['membership/comparison.md', 'matches/standings-women-super-league.md'].includes(page.path));
    if (replacedSources.length) {
      // A fallback or corrected URL must replace the old source at the same stable path.
      await this.database.transaction(async manager => {
        const repository = manager.getRepository(SourceDocumentEntity);
        for (const page of replacedSources) {
          await repository.delete({ path: page.path, type: page.type, source: Not(page.source) });
        }
        await repository.upsert(documents, ['path', 'source', 'type']);
      });
      return;
    }
    await this.database.getRepository(SourceDocumentEntity).upsert(documents, ['path', 'source', 'type']);
  }

  /** Retire unused captures so the next rebuild cannot reindex them. */
  async removeObsolete(): Promise<number> {
    const repository = this.database.getRepository(SourceDocumentEntity);
    const candidates = await repository.find({
      where: [
        ...['store/catalog/%', 'matches/reports/%', 'news/articles/%'].map(prefix => ({ path: Like(prefix) })),
        ...RETIRED_HOMEPAGE_PATHS.map(path => ({ path })),
      ],
      select: { id: true, path: true, source: true },
    });
    const ids = candidates.filter(page => isObsoleteCapture(page.path, page.source)).map(page => page.id);
    if (ids.length) await repository.delete(ids);
    return ids.length;
  }

  /** Read the archive in stable UUID order without loading it all into memory. */
  async *readBatches(): AsyncGenerator<SourceDocumentEntity[]> {
    const repository = this.database.getRepository(SourceDocumentEntity);
    let lastId: string | undefined;
    while (true) {
      const documents = await repository.find({
        where: lastId ? { id: MoreThan(lastId) } : {},
        order: { id: 'ASC' },
        take: SOURCE_BATCH_SIZE,
      });
      if (!documents.length) return;
      yield documents;
      lastId = documents[documents.length - 1].id;
    }
  }
}
