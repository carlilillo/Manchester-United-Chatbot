import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { Memory } from '@united/contracts';

export interface MemoryMetadata extends Omit<Memory, 'updatedAt'> {
  userId: string;
  revision: string;
  active: boolean;
  updatedAt: string;
}

/** Map only the columns this application updates; never synchronize a library-owned table. */
@Entity({ name: 'united_memory_vectors', synchronize: false })
export class MemoryVectorEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('jsonb')
  metadata!: MemoryMetadata;

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
