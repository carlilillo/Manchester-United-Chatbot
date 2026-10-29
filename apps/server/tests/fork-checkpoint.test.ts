import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { describe, expect, it, vi } from 'vitest';
import { findForkCheckpoint, type CheckpointSnapshot } from '../src/agent/fork-checkpoint';
import { RunService } from '../src/services/run.service';

const snapshot = (id: string, messages: unknown[]): CheckpointSnapshot => ({
  values: { messages },
  config: { configurable: { checkpoint_id: id } },
});

async function* newestFirst(snapshots: CheckpointSnapshot[]) {
  yield* [...snapshots].reverse();
}

const q1 = new HumanMessage({ id: 'q1', content: 'First' });
const a1 = new AIMessage({ id: 'a1', content: 'Answer' });
const q2 = new HumanMessage({ id: 'q2', content: 'Second' });
const a2 = new AIMessage({ id: 'a2', content: 'Answer' });
const history = [
  snapshot('root', []),
  snapshot('after-q1', [q1]),
  snapshot('after-a1', [q1, a1]),
  snapshot('before-q2', [q1, a1]),
  snapshot('after-q2', [q1, a1, q2]),
  snapshot('after-a2', [q1, a1, q2, a2]),
];

describe('edited question checkpoints', () => {
  it('returns the newest checkpoint taken before the edited question', async () => {
    expect(await findForkCheckpoint(newestFirst(history), 'q2', 1)).toBe('before-q2');
    expect(await findForkCheckpoint(newestFirst(history), 'q1', 0)).toBe('root');
  });

  it('counts questions for turns stored without matching ids', async () => {
    expect(await findForkCheckpoint(newestFirst(history), 'unknown', 1)).toBe('before-q2');
  });

  it('starts a fresh thread when no checkpoint exists', async () => {
    expect(await findForkCheckpoint(newestFirst([]), 'q1', 0)).toBeUndefined();
  });

  it('forks the agent thread and sends the question with its original id', async () => {
    const chats = {
      begin: vi
        .fn()
        .mockResolvedValue({ humanId: 'q2', messageId: 'answer', turn: 1, edited: true }),
      finish: vi.fn().mockResolvedValue({ id: 'answer' }),
    };
    const streamEvents = vi.fn().mockResolvedValue({
      messages: newestFirst([]),
      toolCalls: newestFirst([]),
      subagents: newestFirst([]),
      output: Promise.resolve(),
    });
    const getStateHistory = vi.fn(() => newestFirst(history));
    const agents = {
      create: vi.fn().mockResolvedValue({
        agent: { streamEvents, graph: { getStateHistory } },
        context: {},
        sources: { resolve: vi.fn().mockResolvedValue([]) },
      }),
    };
    const stream = { signal: new AbortController().signal, emit: vi.fn() };
    await new RunService(agents as never, chats as never).run(
      'user',
      'thread',
      'Edited',
      'request',
      stream,
      'q2',
    );
    expect(chats.begin).toHaveBeenCalledWith('user', 'thread', 'Edited', 'request', 'q2');
    expect(getStateHistory).toHaveBeenCalledWith({
      configurable: { thread_id: 'web:user:thread' },
    });
    const [input, config] = streamEvents.mock.calls[0];
    expect(input.messages[0]).toMatchObject({ id: 'q2', content: 'Edited' });
    expect(config.configurable).toEqual({
      thread_id: 'web:user:thread',
      checkpoint_id: 'before-q2',
    });
    expect(chats.finish).toHaveBeenCalledWith('user', 'thread', 'answer', 'complete', []);
  });
});
