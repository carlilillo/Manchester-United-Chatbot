import { DataSource } from 'typeorm';
import { env } from './env';
import { UserEntity } from '../entities/user.entity';
import { ChatEntity } from '../entities/chat.entity';
import { SourceDocumentEntity } from '../entities/source-document.entity';
import { IngestionRunEntity } from '../entities/ingestion-run.entity';
import { InitialSchema1761264000000 } from '../migrations/1761264000000-initial-schema';
import { SeparateSourceIngestion1792886400000 } from '../migrations/1792886400000-separate-source-ingestion';
export const entities = [UserEntity, ChatEntity, SourceDocumentEntity, IngestionRunEntity];
export function createDataSource() {
  const config = env();
  return new DataSource({
    type: 'postgres', url: config.DATABASE_URL, schema: config.DATABASE_SCHEMA, entities,
    migrations: [InitialSchema1761264000000, SeparateSourceIngestion1792886400000],
    synchronize: false,
  });
}
