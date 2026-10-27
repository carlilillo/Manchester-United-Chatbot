import { MigrationInterface, QueryRunner } from 'typeorm';
import { env } from '../config/env';

/** Allow captured documents to exist before their first vectorization. */
export class SeparateSourceIngestion1792886400000 implements MigrationInterface {
  name = 'SeparateSourceIngestion1792886400000';

  async up(runner: QueryRunner): Promise<void> {
    const schema = env().DATABASE_SCHEMA.replaceAll('"', '""');
    await runner.query(`ALTER TABLE "${schema}".source_documents ALTER COLUMN "activeRevision" DROP NOT NULL`);
  }

  async down(runner: QueryRunner): Promise<void> {
    const schema = env().DATABASE_SCHEMA.replaceAll('"', '""');
    await runner.query(`UPDATE "${schema}".source_documents SET "activeRevision" = '' WHERE "activeRevision" IS NULL`);
    await runner.query(`ALTER TABLE "${schema}".source_documents ALTER COLUMN "activeRevision" SET NOT NULL`);
  }
}
