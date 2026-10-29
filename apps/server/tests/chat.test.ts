import { ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ChatService } from '../src/services/chat.service';
import { ChatEntity } from '../src/entities/chat.entity';

function setup() {
  const chat = {
    userId: 'owner',
    threadId: 'thread',
    title: 'New Chat',
    messages: [] as Array<Record<string, unknown>>,
    status: 'idle',
    version: 0,
  };
  const repository = {
    findOne: vi.fn().mockResolvedValue(chat),
    save: vi.fn(async (value) => value),
  };
  const transaction = vi.fn(async (work) =>
    work({
      getRepository: (entity: unknown) => {
        expect(entity).toBe(ChatEntity);
        return repository;
      },
    }),
  );
  const service = new ChatService({ manager: { transaction } } as never);
  return { service, chat, repository };
}

describe('conversation mutations', () => {
  it('checks ownership and acquires a row lock before reserving a run', async () => {
    const { service, chat, repository } = setup();
    const messageId = await service.begin('owner', 'thread', 'Hello', 'request');
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { userId: 'owner', threadId: 'thread' },
      lock: { mode: 'pessimistic_write' },
    });
    expect(chat.messages.map((message) => message.role)).toEqual(['human', 'ai']);
    expect(chat.messages[1].id).toBe(messageId);
    expect(chat).toMatchObject({ title: 'Hello', status: 'running', version: 1 });
  });

  it('rejects a duplicate request before appending messages', async () => {
    const { service, chat, repository } = setup();
    chat.messages.push({ requestId: 'request' });
    await expect(service.begin('owner', 'thread', 'Hello', 'request')).rejects.toThrow(
      ConflictException,
    );
    expect(chat.messages).toHaveLength(1);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('does not mutate a conversation belonging to another visitor', async () => {
    const { service, repository } = setup();
    repository.findOne.mockResolvedValueOnce(null);
    await expect(service.begin('other-user', 'thread', 'Hello', 'request')).rejects.toThrow(
      NotFoundException,
    );
    expect(repository.save).not.toHaveBeenCalled();
  });
});
