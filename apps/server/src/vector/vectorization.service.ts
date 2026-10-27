import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { SourceDocumentService } from '../ingestion/source-document.service';
import { batches } from '../utils/batches';
import { withDocumentWorkflowLock } from '../utils/document-workflow-lock';
import { splitSourceDocuments } from './utils/split-documents';
import { VectorService } from './vector.service';

const VECTOR_BATCH_SIZE = 128;

/** Rebuild the knowledge index from persisted sources, independently of fetching. */
@Injectable()
export class VectorizationService {
  private readonly logger = new Logger(VectorizationService.name);

  constructor(
    private readonly database: DataSource,
    private readonly documents: SourceDocumentService,
    private readonly vectors: VectorService,
  ) {}

  /** Prevent concurrent source updates or rebuilds while reading and publishing the archive. */
  async run() {
    return withDocumentWorkflowLock(this.database, () => this.rebuildIndex());
  }

  /** Stage bounded batches, then make the entire revision searchable in one transaction. */
  private async rebuildIndex() {
    const revision = randomUUID();
    let documentCount = 0;
    let chunkCount = 0;
    let stagingStarted = false;
    this.logger.log(`Starting vectorization: ${revision}`);

    try {
      for await (const sources of this.documents.readBatches()) {
        const chunks = await splitSourceDocuments(sources, revision);
        // Initialize before staging so failure cleanup always has a vector store.
        await this.vectors.initialize();
        stagingStarted = true;
        for (const batch of batches(chunks, VECTOR_BATCH_SIZE)) {
          await this.vectors.stageKnowledgeBatch(batch);
          chunkCount += batch.length;
          this.logger.log(`Staged ${batch.length} chunks (${chunkCount} total)`);
        }
        documentCount += sources.length;
        this.logger.log(`Read and split ${documentCount} database documents`);
      }
      if (!documentCount) {
        this.logger.log('No stored documents to vectorize');
        return { status: 'empty', documents: 0, chunks: 0 };
      }
      await this.vectors.publishKnowledgeRevision(revision);
    } catch (error) {
      this.logger.error(`Vectorization failed: ${String(error)}`);
      if (stagingStarted) {
        await this.vectors.discardKnowledgeRevision(revision).catch(cleanupError => {
          this.logger.warn(`Could not remove unpublished revision ${revision}: ${String(cleanupError)}`);
        });
      }
      throw error;
    }

    // Cleanup failure must not undo or misreport a successfully published revision.
    await this.vectors.deleteInactiveKnowledge().catch(error => {
      this.logger.warn(`Index published; old vector cleanup failed: ${String(error)}`);
    });
    this.logger.log(`Vectorization completed: ${documentCount} documents, ${chunkCount} chunks`);
    return { status: 'completed', documents: documentCount, chunks: chunkCount, revision };
  }
}
