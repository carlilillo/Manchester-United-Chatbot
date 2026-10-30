import { MigrationInterface, QueryRunner } from 'typeorm';
import { env } from '../config/env';

/** Record which topics each ingestion run captured, so topics can refresh on separate schedules. */
export class IngestionRunTopics1793318400000 implements MigrationInterface {
  name = 'IngestionRunTopics1793318400000';

  async up(runner: QueryRunner): Promise<void> {
    const schema = env().DATABASE_SCHEMA.replaceAll('"', '""');
    // Earlier runs always captured every topic.
    await runner.query(`ALTER TABLE "${schema}".ingestion_runs ADD COLUMN topics text[] NOT NULL DEFAULT ARRAY['homepage','news','matches','people','membership','store','travel','videos']::text[]`);
    await runner.query(`ALTER TABLE "${schema}".ingestion_runs ALTER COLUMN topics DROP DEFAULT`);
  }

  async down(runner: QueryRunner): Promise<void> {
    const schema = env().DATABASE_SCHEMA.replaceAll('"', '""');
    await runner.query(`ALTER TABLE "${schema}".ingestion_runs DROP COLUMN topics`);
  }
}
