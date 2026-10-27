import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { IngestionRunEntity } from '../entities/ingestion-run.entity';
import { batches } from '../utils/batches';
import { withDocumentWorkflowLock } from '../utils/document-workflow-lock';
import { CapturedPage, scrapeAll } from './scrapers';
import { SOURCE_BATCH_SIZE, SourceDocumentService } from './source-document.service';
import { MARKDOWN_DIRECTORY, saveMarkdownFile } from './utils/markdown-file';
import { removeObsoleteFiles } from './utils/obsolete-captures';

/** Fetch and persist full source documents without invoking the embedding service. */
@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    private readonly database: DataSource,
    private readonly documents: SourceDocumentService,
  ) {}

  /** Run an exclusive capture, keeping it separate from vectorization. */
  async run() {
    return withDocumentWorkflowLock(this.database, () => this.captureDocuments());
  }

  /** Record fetch/storage failures while retaining successful captures for later indexing. */
  private async captureDocuments() {
    const repository = this.database.getRepository(IngestionRunEntity);
    const record = await repository.save(repository.create({
      status: 'running', updated: 0, failed: 0, errors: [], finishedAt: null,
    }));
    const errors: string[] = [];
    const reportError = (message: string) => {
      errors.push(message);
      this.logger.error(message);
    };

    try {
      this.logger.log(`Starting ingestion; Markdown directory: ${MARKDOWN_DIRECTORY}`);
      const removed = await this.documents.removeObsolete();
      await removeObsoleteFiles(message => this.logger.log(message));
      this.logger.log(`Removed ${removed} obsolete database documents`);
      const pages = await scrapeAll(reportError);
      for (const batch of batches(pages, SOURCE_BATCH_SIZE)) {
        const saved: CapturedPage[] = [];
        for (const page of batch) {
          try {
            const destination = await saveMarkdownFile(page);
            this.logger.log(`Saved Markdown: ${page.source} -> ${destination}`);
            saved.push(page);
          } catch (error) {
            reportError(`${page.path} (${page.source}): ${String(error)}`);
          }
        }
        try {
          await this.documents.saveBatch(saved);
          record.updated += saved.length;
          this.logger.log(`Stored ${saved.length} source documents in the database`);
        } catch (error) {
          for (const page of saved) reportError(`${page.path}: database save failed: ${String(error)}`);
        }
      }
      record.status = errors.length ? 'partial' : 'completed';
      this.logger.log(`Ingestion ${record.status}: ${record.updated} stored, ${errors.length} failures`);
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
