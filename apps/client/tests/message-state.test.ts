import { describe, expect, it } from 'vitest';
import type { ChatMessage } from '@united/contracts';
import { applyStreamEvent } from '../src/features/chat/message-state';

const createdAt = '2026-10-27T12:00:00Z';
const human: ChatMessage = {
  id: 'question',
  role: 'human',
  content: 'Tell me about United',
  createdAt,
  status: 'complete',
};

describe('transcript stream updates', () => {
  it('appends answer text without mutating earlier transcript snapshots', () => {
    const initial = [human];
    const started = applyStreamEvent(
      initial,
      { type: 'started', threadId: 'thread', messageId: 'answer' },
      createdAt,
    );
    const partial = applyStreamEvent(
      started,
      { type: 'delta', messageId: 'answer', text: 'Manchester ' },
      createdAt,
    );
    const next = applyStreamEvent(
      partial,
      { type: 'delta', messageId: 'answer', text: 'United' },
      createdAt,
    );
    expect(initial).toEqual([human]);
    expect(started[1].content).toBe('');
    expect(partial[1].content).toBe('Manchester ');
    expect(next[1].content).toBe('Manchester United');
    expect(next[0]).toBe(human);
  });

  it('updates a running activity in place and accepts the final persisted answer', () => {
    const started = applyStreamEvent(
      [human],
      { type: 'started', threadId: 'thread', messageId: 'answer' },
      createdAt,
    );
    const activity = {
      id: 'source',
      kind: 'tool' as const,
      title: 'Club archive',
      status: 'running' as const,
      timestamp: createdAt,
    };
    const working = applyStreamEvent(
      started,
      { type: 'activity', messageId: 'answer', activity },
      createdAt,
    );
    const finished = applyStreamEvent(
      working,
      { type: 'activity', messageId: 'answer', activity: { ...activity, status: 'completed' } },
      createdAt,
    );
    expect(finished[1].activity).toHaveLength(1);
    expect(finished[1].activity?.[0].status).toBe('completed');
    const persisted = { ...finished[1], content: 'Verified answer', status: 'complete' as const };
    expect(
      applyStreamEvent(finished, { type: 'completed', message: persisted }, createdAt)[1],
    ).toEqual(persisted);
  });
});
