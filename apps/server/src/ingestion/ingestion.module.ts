import { Module } from '@nestjs/common';
import { DatabaseModule } from '../config/database.module';
import { IngestionService } from './ingestion.service';
import { SourceDocumentService } from './source-document.service';

/** Ingestion requires only PostgreSQL and the official websites, not an embedding client. */
@Module({
  imports: [DatabaseModule],
  providers: [IngestionService, SourceDocumentService],
  exports: [IngestionService, SourceDocumentService],
})
export class IngestionModule {}
