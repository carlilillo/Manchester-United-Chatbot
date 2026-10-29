import { createDataSource, entities } from '../config/database';
import { KnowledgeVectorEntity } from '../entities/knowledge-vector.entity';
import { MemoryVectorEntity } from '../entities/memory-vector.entity';

/**
 * Register vector columns before connecting so TypeORM installs pgvector before migrations
 * change the search path. This preserves fresh-database setup for custom application schemas.
 * Schema synchronization stays disabled; the vector adapter continues to create its own tables.
 */
export function createWorkflowDataSource() {
  return createDataSource().setOptions({
    entities: [...entities, KnowledgeVectorEntity, MemoryVectorEntity],
  });
}
