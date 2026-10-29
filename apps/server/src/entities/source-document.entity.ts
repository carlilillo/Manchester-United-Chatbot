import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'source_documents' })
@Index(['path', 'source', 'type'], { unique: true })
export class SourceDocumentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('text')
  path!: string;

  @Column('text')
  source!: string;

  @Column('text')
  type!: string;

  @Column('text')
  markdown!: string;

  @Column('text')
  contentHash!: string;

  @Column('text', { nullable: true })
  activeRevision!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
