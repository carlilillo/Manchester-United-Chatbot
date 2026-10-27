import 'reflect-metadata';
import { Pool } from 'pg';
import { NestFactory } from '@nestjs/core';
import { createDataSource } from './config/database';
import { env } from './config/env';
import { AppModule } from './app.module';
import { PersistenceService } from './services/persistence.service';
import { IngestionService } from './ingestion/ingestion.service';
import { IngestionModule } from './ingestion/ingestion.module';
import { VectorModule } from './vector/vector.module';
import { VectorizationService } from './vector/vectorization.service';

/** Apply schema changes, then start only the services required by the requested workflow. */
async function main() {
  const command = process.argv[2];
  if (!['migrate', 'revert', 'setup', 'ingest', 'vectorize'].includes(command)) {
    throw new Error(`Unknown command: ${command}`);
  }
  const schema = env().DATABASE_SCHEMA;
  const pool = new Pool({ connectionString: env().DATABASE_URL });
  try {
    await pool.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
    await pool.query('CREATE EXTENSION IF NOT EXISTS vector');
  } finally { await pool.end(); }
  const db = createDataSource();
  await db.initialize();
  try {
    if (command !== 'revert') await db.runMigrations();
    if (command === 'revert') await db.undoLastMigration();
  } finally { await db.destroy(); }
  if (command === 'setup' || command === 'ingest' || command === 'vectorize') {
    const module = command === 'ingest' ? IngestionModule : command === 'vectorize' ? VectorModule : AppModule;
    const app = await NestFactory.createApplicationContext(module);
    try {
      if (command === 'setup') await app.get(PersistenceService).setup();
      if (command === 'ingest') console.log(await app.get(IngestionService).run());
      if (command === 'vectorize') console.log(await app.get(VectorizationService).run());
    } finally { await app.close(); }
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
