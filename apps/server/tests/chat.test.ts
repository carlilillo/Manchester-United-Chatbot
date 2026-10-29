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
    const reservation = await service.begin('owner', 'thread', 'Hello', 'request');
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { userId: 'owner', threadId: 'thread' },
      lock: { mode: 'pessimistic_write' },
    });
    expect(chat.messages.map((message) => message.role)).toEqual(['human', 'ai']);
    expect(chat.messages[0].id).toBe('request');
    expect(chat.messages[1].id).toBe(reservation.messageId);
    expect(reservation).toMatchObject({ humanId: 'request', turn: 0, edited: false });
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

  it('replaces an edited question and discards the messages after it', async () => {
    const { service, chat } = setup();
    chat.title = 'First question';
    chat.messages.push(
      { id: 'q1', role: 'human', content: 'First question', requestId: 'r1' },
      { id: 'a1', role: 'ai', content: 'First answer' },
      { id: 'q2', role: 'human', content: 'Second question', requestId: 'r2' },
      { id: 'a2', role: 'ai', content: 'Second answer' },
    );
    const reservation = await service.begin('owner', 'thread', 'Edited question', 'r3', 'q2');
    expect(reservation).toMatchObject({ humanId: 'q2', turn: 1, edited: true });
    expect(chat.messages.map((message) => message.id)).toEqual([
      'q1',
      'a1',
      'q2',
      reservation.messageId,
    ]);
    expect(chat.messages[2]).toMatchObject({ content: 'Edited question', requestId: 'r3' });
    expect(chat).toMatchObject({ title: 'First question', status: 'running' });
  });

  it('retitles a conversation when its first question is edited', async () => {
    const { service, chat } = setup();
    chat.title = 'First question';
    chat.messages.push(
      { id: 'q1', role: 'human', content: 'First question', requestId: 'r1' },
      { id: 'a1', role: 'ai', content: 'First answer' },
    );
    const reservation = await service.begin('owner', 'thread', 'Better question', 'r2', 'q1');
    expect(reservation.turn).toBe(0);
    expect(chat.messages.map((message) => message.id)).toEqual(['q1', reservation.messageId]);
    expect(chat.title).toBe('Better question');
  });

  it('only edits questions that exist in the conversation', async () => {
    const { service, chat, repository } = setup();
    chat.messages.push({ id: 'a1', role: 'ai', content: 'An answer' });
    for (const id of ['a1', 'missing'])
      await expect(service.begin('owner', 'thread', 'Edit', 'r2', id)).rejects.toThrow(
        NotFoundException,
      );
    expect(chat.messages).toHaveLength(1);
    expect(repository.save).not.toHaveBeenCalled();
  });
});
