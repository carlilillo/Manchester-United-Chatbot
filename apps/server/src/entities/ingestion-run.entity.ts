import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'ingestion_runs' })
export class IngestionRunEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('text')
  status!: string;

  @Column('int', { default: 0 })
  updated!: number;

  @Column('int', { default: 0 })
  failed!: number;

  @Column('jsonb', { default: () => "'[]'::jsonb" })
  errors!: string[];

  @CreateDateColumn({ type: 'timestamptz' })
  startedAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  finishedAt!: Date | null;
}
