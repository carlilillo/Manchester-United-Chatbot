import { Module } from '@nestjs/common';
import { ApplicationRepositoriesModule } from '../repositories/application-repositories.module';
import { IngestionService } from './ingestion.service';
import { SourceDocumentService } from './source-document.service';

/** Ingestion requires only PostgreSQL and the official websites, not an embedding client. */
@Module({
  imports: [ApplicationRepositoriesModule],
  providers: [IngestionService, SourceDocumentService],
  exports: [IngestionService, SourceDocumentService, ApplicationRepositoriesModule],
})
export class IngestionModule {}
