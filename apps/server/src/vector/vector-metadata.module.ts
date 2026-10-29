import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { env } from '../config/env';
import { KnowledgeVectorEntity } from '../entities/knowledge-vector.entity';
import { MemoryVectorEntity } from '../entities/memory-vector.entity';
import { SourceDocumentEntity } from '../entities/source-document.entity';
import { UserEntity } from '../entities/user.entity';
import { VectorMetadataRepository } from './vector-metadata.repository';
import { VECTOR_METADATA_CONNECTION } from './vector.constants';

const entities = [KnowledgeVectorEntity, MemoryVectorEntity, SourceDocumentEntity, UserEntity];

/**
 * The existing database configuration has a fixed entity list and is intentionally unchanged.
 * This named connection maps library-owned tables without synchronizing or migrating them.
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      name: VECTOR_METADATA_CONNECTION,
      useFactory: () => ({
        name: VECTOR_METADATA_CONNECTION,
        type: 'postgres' as const,
        url: env().DATABASE_ASYNC_URL,
        schema: env().DATABASE_SCHEMA,
        entities,
        synchronize: false,
        migrationsRun: false,
      }),
    }),
    TypeOrmModule.forFeature(entities, VECTOR_METADATA_CONNECTION),
  ],
  providers: [VectorMetadataRepository],
  exports: [VectorMetadataRepository],
})
export class VectorMetadataModule {}
