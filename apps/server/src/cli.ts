import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { createWorkflowDataSource } from './utils/workflow-database';
import { env } from './config/env';
import { AppModule } from './app.module';
import { PersistenceService } from './services/persistence.service';
import { IngestionService } from './ingestion/ingestion.service';
import { IngestionModule } from './ingestion/ingestion.module';
import { SourceDocumentService } from './ingestion/source-document.service';
import { INGESTION_TOPICS, isIngestionTopic } from './ingestion/schedules';
import { VectorModule } from './vector/vector.module';
import { VectorizationService } from './vector/vectorization.service';

/** Apply schema changes, then start only the services required by the requested workflow. */
async function main() {
  const command = process.argv[2];
  if (!['migrate', 'revert', 'setup', 'ingest', 'vectorize', 'export-markdown'].includes(command)) {
    throw new Error(`Unknown command: ${command}`);
  }
  // `ingest news matches` limits a manual run to those topics; no arguments captures everything.
  const topics = process.argv.slice(3);
  const unknown = topics.filter((topic) => !isIngestionTopic(topic));
  if (command === 'ingest' && unknown.length) {
    throw new Error(
      `Unknown topics: ${unknown.join(', ')} (expected ${INGESTION_TOPICS.join(', ')})`,
    );
  }
  const db = createWorkflowDataSource();
  await db.initialize();
  try {
    // The driver initializes extensions; schema creation uses TypeORM's API.
    if (command !== 'revert') {
      const runner = db.createQueryRunner();
      try {
        await runner.createSchema(env().DATABASE_SCHEMA, true);
      } finally {
        await runner.release();
      }
      await db.runMigrations();
    }
    if (command === 'revert') await db.undoLastMigration();
  } finally {
    await db.destroy();
  }
  if (['setup', 'ingest', 'vectorize', 'export-markdown'].includes(command)) {
    const module =
      command === 'ingest' || command === 'export-markdown'
        ? IngestionModule
        : command === 'vectorize'
          ? VectorModule
          : AppModule;
    const app = await NestFactory.createApplicationContext(module);
    try {
      if (command === 'setup') await app.get(PersistenceService).setup();
      if (command === 'ingest') {
        const selected = topics.filter(isIngestionTopic);
        console.log(await app.get(IngestionService).run(selected.length ? selected : undefined));
      }
      if (command === 'vectorize') console.log(await app.get(VectorizationService).run());
      if (command === 'export-markdown') {
        console.log(await app.get(SourceDocumentService).exportMarkdown());
      }
    } finally {
      await app.close();
    }
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
