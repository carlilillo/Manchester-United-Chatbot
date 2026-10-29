import { Column, Entity, PrimaryColumn } from 'typeorm';

/** Metadata projection of the PGVectorStore table; embeddings remain owned by the vector adapter. */
@Entity({ name: 'united_knowledge_vectors', synchronize: false })
export class KnowledgeVectorEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('jsonb')
  metadata!: Record<string, unknown>;

  // Register pgvector with TypeORM without loading or modifying the library-owned embedding.
  @Column({
    type: 'vector',
    length: 3072,
    nullable: true,
    select: false,
    insert: false,
    update: false,
  })
  embedding?: number[];
}
