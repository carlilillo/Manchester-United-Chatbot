import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'node:crypto';
import type { Activity, ChatMessage, ChatSummary } from '@united/contracts';
import { ChatEntity } from '../entities/chat.entity';

@Injectable()
export class ChatService {
  constructor(private readonly db: DataSource) {}
  async create(userId: string) {
    const repo = this.db.getRepository(ChatEntity);
    return repo.save(repo.create({ userId, title: 'New Chat', messages: [], status: 'idle' }));
  }
  async list(userId: string, limit = 30, offset = 0): Promise<ChatSummary[]> {
    const rows = await this.db.getRepository(ChatEntity).find({ where: { userId }, order: { updatedAt: 'DESC' }, take: Math.min(limit, 100), skip: offset });
    return rows.map(row => ({ threadId: row.threadId, title: row.title, updatedAt: row.updatedAt.toISOString() }));
  }
  async get(userId: string, threadId: string) {
    const row = await this.db.getRepository(ChatEntity).findOneBy({ userId, threadId });
    if (!row) throw new NotFoundException('Chat not found');
    return row;
  }
  /** Lock the conversation row before changing JSONB so feedback and streaming writes cannot race. */
  private async mutate(userId: string, threadId: string, change: (chat: ChatEntity) => void) {
    return this.db.transaction(async manager => {
      const row = await manager.getRepository(ChatEntity).createQueryBuilder('chat').setLock('pessimistic_write')
        .where('chat."threadId" = :threadId AND chat."userId" = :userId', { threadId, userId }).getOne();
      if (!row) throw new NotFoundException('Chat not found');
      change(row); row.version += 1;
      return manager.save(row);
    });
  }
  async begin(userId: string, threadId: string, text: string, requestId: string) {
    const human: ChatMessage = { id: randomUUID(), role: 'human', content: text, createdAt: new Date().toISOString(), status: 'complete', requestId };
    const ai: ChatMessage = { id: randomUUID(), role: 'ai', content: '', createdAt: new Date().toISOString(), status: 'streaming', activity: [], feedback: null };
    await this.mutate(userId, threadId, row => {
      if (row.messages.some(m => m.requestId === requestId)) throw new ConflictException('Duplicate request');
      if (row.status === 'running') throw new ConflictException('This chat already has an active run');
      row.messages = [...row.messages, human, ai]; row.status = 'running';
      if (row.title === 'New Chat') row.title = text.slice(0, 80);
    });
    return ai.id;
  }
  async append(userId: string, threadId: string, messageId: string, text: string) {
    await this.mutate(userId, threadId, row => {
      const target = row.messages.find(m => m.id === messageId);
      if (target) target.content += text;
    });
  }
  async activity(userId: string, threadId: string, messageId: string, activity: Activity) {
    await this.mutate(userId, threadId, row => {
      const target = row.messages.find(m => m.id === messageId);
      if (!target) return;
      const entries = target.activity ?? [];
      const index = entries.findIndex(item => item.id === activity.id);
      if (index < 0) entries.push(activity); else entries[index] = activity;
      target.activity = entries;
    });
  }
  async finish(userId: string, threadId: string, messageId: string, status: 'complete' | 'failed' | 'cancelled') {
    const row = await this.mutate(userId, threadId, row => {
      const target = row.messages.find(m => m.id === messageId);
      if (target) target.status = status;
      row.status = 'idle';
    });
    return row.messages.find(m => m.id === messageId)!;
  }
  async feedback(userId: string, threadId: string, messageId: string, feedback: 'like' | 'dislike' | null) {
    const row = await this.mutate(userId, threadId, row => {
      const target = row.messages.find(m => m.id === messageId && m.role === 'ai');
      if (!target) throw new NotFoundException('Assistant message not found');
      target.feedback = feedback;
    });
    return row.messages.find(m => m.id === messageId);
  }
}
