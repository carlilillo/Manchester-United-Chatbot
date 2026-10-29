import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from '../config/database.module';
import { ChatEntity } from '../entities/chat.entity';
import { IngestionRunEntity } from '../entities/ingestion-run.entity';
import { SourceDocumentEntity } from '../entities/source-document.entity';
import { UserEntity } from '../entities/user.entity';

/** Shares repository providers through existing feature modules without changing the root module. */
@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([ChatEntity, UserEntity, SourceDocumentEntity, IngestionRunEntity]),
  ],
  exports: [TypeOrmModule],
})
export class ApplicationRepositoriesModule {}
