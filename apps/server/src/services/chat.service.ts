import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'node:crypto';
import type { Activity, ChatMessage, ChatSummary } from '@united/contracts';
import type { MessageSource } from '../agent/sources/source-collector';
import { ChatEntity } from '../entities/chat.entity';

/** The question and answer slots reserved for one agent run. */
export interface RunReservation {
  /** Id of the question sent to the agent; an edit keeps the original id. */
  humanId: string;
  /** Id of the streaming answer. */
  messageId: string;
  /** Number of questions that precede this one in the conversation. */
  turn: number;
  /** Whether the run replaces an earlier question rather than appending one. */
  edited: boolean;
}

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatEntity) private readonly conversations: Repository<ChatEntity>,
  ) {}

  async create(userId: string) {
    const repo = this.conversations;
    return repo.save(repo.create({ userId, title: 'New Chat', messages: [], status: 'idle' }));
  }

  async list(userId: string, limit = 30, offset = 0): Promise<ChatSummary[]> {
    const rows = await this.conversations.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
      take: Math.min(limit, 100),
      skip: offset,
    });
    return rows.map((row) => ({
      threadId: row.threadId,
      title: row.title,
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  async get(userId: string, threadId: string) {
    const row = await this.conversations.findOneBy({ userId, threadId });
    if (!row) throw new NotFoundException('Chat not found');
    return row;
  }

  /** Lock the conversation row before changing JSONB so feedback and streaming writes cannot race. */
  private async mutate(userId: string, threadId: string, change: (chat: ChatEntity) => void) {
    return this.conversations.manager.transaction(async (manager) => {
      const repository = manager.getRepository(ChatEntity);
      const row = await repository.findOne({
        where: { threadId, userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!row) throw new NotFoundException('Chat not found');
      change(row);
      row.version += 1;
      return repository.save(row);
    });
  }

  /**
   * Reserve the run and its messages under one lock, rejecting retries and concurrent sends.
   * Editing keeps the question's id, replaces its text and discards every later message.
   */
  async begin(
    userId: string,
    threadId: string,
    text: string,
    requestId: string,
    editMessageId?: string,
  ): Promise<RunReservation> {
    const createdAt = new Date().toISOString();
    // The request id doubles as the question id, matching the client's optimistic copy.
    let human: ChatMessage = {
      id: requestId,
      role: 'human',
      content: text,
      createdAt,
      status: 'complete',
      requestId,
    };
    let turn = 0;
    const ai: ChatMessage = {
      id: randomUUID(),
      role: 'ai',
      content: '',
      createdAt,
      status: 'streaming',
      activity: [],
      feedback: null,
    };
    await this.mutate(userId, threadId, (row) => {
      if (row.messages.some((m) => m.requestId === requestId))
        throw new ConflictException('Duplicate request');
      if (row.status === 'running')
        throw new ConflictException('This chat already has an active run');
      const index = editMessageId
        ? row.messages.findIndex((m) => m.id === editMessageId && m.role === 'human')
        : row.messages.length;
      if (index < 0) throw new NotFoundException('Message not found');
      const earlier = row.messages.slice(0, index);
      turn = earlier.filter((m) => m.role === 'human').length;
      if (editMessageId) {
        const original = row.messages[index];
        human = { ...original, content: text, createdAt, requestId };
        // A title taken from the first question follows that question's edits.
        if (turn === 0 && row.title === original.content.slice(0, 80))
          row.title = text.slice(0, 80);
      }
      row.messages = [...earlier, human, ai];
      row.status = 'running';
      if (row.title === 'New Chat') row.title = text.slice(0, 80);
    });
    return { humanId: human.id, messageId: ai.id, turn, edited: Boolean(editMessageId) };
  }

  async append(userId: string, threadId: string, messageId: string, text: string) {
    await this.mutate(userId, threadId, (row) => {
      const target = row.messages.find((m) => m.id === messageId);
      if (target) target.content += text;
    });
  }

  /** Replace a running activity with its final state instead of adding duplicate entries. */
  async activity(userId: string, threadId: string, messageId: string, activity: Activity) {
    await this.mutate(userId, threadId, (row) => {
      const target = row.messages.find((m) => m.id === messageId);
      if (!target) return;
      const entries = target.activity ?? [];
      const index = entries.findIndex((item) => item.id === activity.id);
      if (index < 0) entries.push(activity);
      else entries[index] = activity;
      target.activity = entries;
    });
  }

  /** Close a run; a completed answer also records the sources its agents used. */
  async finish(
    userId: string,
    threadId: string,
    messageId: string,
    status: 'complete' | 'failed' | 'cancelled',
    sources?: MessageSource[],
  ) {
    const row = await this.mutate(userId, threadId, (row) => {
      const target = row.messages.find((m) => m.id === messageId);
      if (target) target.status = status;
      if (target && sources?.length) target.sources = sources;
      row.status = 'idle';
    });
    return row.messages.find((m) => m.id === messageId)!;
  }

  async feedback(
    userId: string,
    threadId: string,
    messageId: string,
    feedback: 'like' | 'dislike' | null,
  ) {
    const row = await this.mutate(userId, threadId, (row) => {
      const target = row.messages.find((m) => m.id === messageId && m.role === 'ai');
      if (!target) throw new NotFoundException('Assistant message not found');
      target.feedback = feedback;
    });
    return row.messages.find((m) => m.id === messageId);
  }
}
