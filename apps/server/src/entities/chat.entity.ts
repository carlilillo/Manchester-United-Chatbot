import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { ChatMessage } from '@united/contracts';

@Entity({ name: 'chat_conversations' })
@Index(['userId', 'updatedAt'])
export class ChatEntity {
  @PrimaryGeneratedColumn('uuid')
  threadId!: string;

  @Column('uuid')
  userId!: string;

  @Column('text')
  title!: string;

  @Column('jsonb', { default: () => "'[]'::jsonb" })
  messages!: ChatMessage[];

  @Column('text', { default: 'idle' })
  status!: string;

  @Column('int', { default: 0 })
  version!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
