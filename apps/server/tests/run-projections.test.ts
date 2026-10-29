import { describe, expect, it, vi } from 'vitest';
import { consumeRunProjections } from '../src/utils/run-projections';
import type { Activity } from '@united/contracts';

async function* values<T>(...items: T[]) {
  yield* items;
}

describe('agent stream projections', () => {
  it('streams text and records each activity lifecycle under a stable identifier', async () => {
    const append = vi.fn();
    const activities: Activity[] = [];
    const cancel = vi.fn();
    await consumeRunProjections(
      {
        messages: values({ text: values('', 'Hello', ' world') }),
        toolCalls: values({
          name: 'search',
          input: Promise.resolve({ query: 'United' }),
          status: Promise.resolve('success'),
        }),
        subagents: values({ name: 'researcher', output: Promise.resolve('Done') }),
      },
      append,
      async (activity) => {
        activities.push(activity);
      },
      cancel,
    );
    expect(append.mock.calls).toEqual([['Hello'], [' world']]);
    for (const kind of ['tool', 'subagent']) {
      const entries = activities.filter((activity) => activity.kind === kind);
      expect(entries.map((activity) => activity.status)).toEqual(['running', 'completed']);
      expect(entries[0].id).toBe(entries[1].id);
    }
    expect(cancel).not.toHaveBeenCalled();
  });

  it('cancels and drains sibling streams before surfacing a persistence error', async () => {
    const abort = new AbortController();
    const events: string[] = [];
    const toolCalls = (async function* () {
      try {
        await new Promise<void>((resolve) =>
          abort.signal.addEventListener('abort', () => resolve(), { once: true }),
        );
      } finally {
        events.push('tool stream closed');
      }
    })();
    await expect(
      consumeRunProjections(
        { messages: values({ text: values('Hello') }), toolCalls, subagents: values() },
        async () => {
          throw new Error('Database unavailable');
        },
        async () => {},
        () => abort.abort(),
      ),
    ).rejects.toThrow('Database unavailable');
    expect(events).toEqual(['tool stream closed']);
  });

  it('cancels pending subagent outputs when the discovery iterator fails', async () => {
    const abort = new AbortController();
    const activities: Activity[] = [];
    const subagents = (async function* () {
      yield {
        name: 'researcher',
        output: new Promise((_, reject) =>
          abort.signal.addEventListener('abort', () => reject(new Error('Aborted')), {
            once: true,
          }),
        ),
      };
      throw new Error('Discovery failed');
    })();
    await expect(
      consumeRunProjections(
        { messages: values(), toolCalls: values(), subagents },
        async () => {},
        async (activity) => {
          activities.push(activity);
        },
        () => abort.abort(),
      ),
    ).rejects.toThrow('Discovery failed');
    expect(activities.map((activity) => activity.status)).toEqual(['running', 'failed']);
  });
});
