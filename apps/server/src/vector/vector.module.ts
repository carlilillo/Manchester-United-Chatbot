import { VectorMetadataModule } from './vector-metadata.module';
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../config/database.module';
import { IngestionModule } from '../ingestion/ingestion.module';
import { VectorService } from './vector.service';
import { VectorizationService } from './vectorization.service';

/** Load indexing without initializing chat agents, sessions, or scheduled jobs. */
@Module({
  imports: [DatabaseModule, IngestionModule, VectorMetadataModule],
  providers: [VectorService, VectorizationService],
  exports: [VectorService, VectorizationService],
})
export class VectorModule {}
