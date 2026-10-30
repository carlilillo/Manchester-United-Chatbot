import { Injectable, Logger } from '@nestjs/common';
import { ArrayContains, DataSource, In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { IngestionRunEntity } from '../entities/ingestion-run.entity';
import { batches } from '../utils/batches';
import { withDocumentWorkflowLock } from '../utils/document-workflow-lock';
import { INGESTION_TOPICS, type IngestionTopic } from './schedules';
import { scrapeTopics } from './scrapers';
import { SOURCE_BATCH_SIZE, SourceDocumentService } from './source-document.service';

/** Fetch and persist full source documents without invoking the embedding service. */
@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    private readonly database: DataSource,
    private readonly documents: SourceDocumentService,
    @InjectRepository(IngestionRunEntity) private readonly runs: Repository<IngestionRunEntity>,
  ) {}

  /** Run an exclusive capture of the given topics, keeping it separate from vectorization. */
  async run(topics: readonly IngestionTopic[] = INGESTION_TOPICS) {
    return withDocumentWorkflowLock(this.database, () => this.captureDocuments(topics));
  }

  /** When all of these topics were last captured together, counting runs with partial failures. */
  async lastCapturedAt(topics: readonly IngestionTopic[]): Promise<Date | undefined> {
    const run = await this.runs.findOne({
      where: { status: In(['completed', 'partial']), topics: ArrayContains([...topics]) },
      order: { startedAt: 'DESC' },
      select: { id: true, startedAt: true },
    });
    return run?.startedAt;
  }

  /** Record fetch/storage failures while retaining successful captures for later indexing. */
  private async captureDocuments(topics: readonly IngestionTopic[]) {
    const repository = this.runs;
    const record = await repository.save(
      repository.create({
        status: 'running',
        topics: [...topics],
        updated: 0,
        failed: 0,
        errors: [],
        finishedAt: null,
      }),
    );
    const errors: string[] = [];
    const reportError = (message: string) => {
      errors.push(message);
      this.logger.error(message);
    };

    try {
      this.logger.log(`Starting ingestion: ${topics.join(', ')}`);
      const removed = await this.documents.removeObsolete();
      this.logger.log(`Removed ${removed} obsolete database documents`);
      const pages = await scrapeTopics(topics, reportError);
      for (const batch of batches(pages, SOURCE_BATCH_SIZE)) {
        try {
          await this.documents.saveBatch(batch);
          record.updated += batch.length;
          this.logger.log(`Stored ${batch.length} source documents in the database`);
        } catch (error) {
          for (const page of batch)
            reportError(`${page.path}: database save failed: ${String(error)}`);
        }
      }
      record.status = errors.length ? 'partial' : 'completed';
      this.logger.log(
        `Ingestion ${record.status}: ${record.updated} stored, ${errors.length} failures`,
      );
      return { status: record.status, updated: record.updated, failed: errors.length, errors };
    } catch (error) {
      record.status = 'failed';
      reportError(`Ingestion failed: ${String(error)}`);
      throw error;
    } finally {
      record.errors = errors;
      record.failed = errors.length;
      record.finishedAt = new Date();
      await repository.save(record);
    }
  }
}
