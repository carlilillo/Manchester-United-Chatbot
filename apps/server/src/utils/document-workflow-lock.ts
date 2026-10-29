import { DataSource } from 'typeorm';

const DOCUMENT_WORKFLOW_LOCK = 77631142;

/**
 * Keep source writes and index rebuilds from overlapping, using one PostgreSQL session.
 * TypeORM has no advisory-lock API: these fixed, parameterized lock primitives are not
 * data queries. Keep the same key as existing deployments so rolling restarts remain safe.
 */
export async function withDocumentWorkflowLock<T>(database: DataSource, work: () => Promise<T>) {
  const runner = database.createQueryRunner();
  let acquired = false;
  try {
    await runner.connect();
    const rows = await runner.query('SELECT pg_try_advisory_lock($1) AS acquired', [
      DOCUMENT_WORKFLOW_LOCK,
    ]);
    acquired = rows[0].acquired;
    if (!acquired) return { status: 'already-running' as const };
    return await work();
  } finally {
    try {
      if (acquired) await runner.query('SELECT pg_advisory_unlock($1)', [DOCUMENT_WORKFLOW_LOCK]);
    } finally {
      await runner.release();
    }
  }
}
