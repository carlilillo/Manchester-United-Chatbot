import { randomUUID } from 'node:crypto';
import type { Activity } from '@united/contracts';

/** The projections consumed by the web application, independent of the agent implementation. */
interface AgentProjections {
  messages: AsyncIterable<{ text: AsyncIterable<string> }>;
  toolCalls: AsyncIterable<{
    name: string;
    input: unknown | PromiseLike<unknown>;
    status: string | PromiseLike<string>;
  }>;
  subagents: AsyncIterable<{ name: string; output: unknown | PromiseLike<unknown> }>;
}

type TrackActivity = (activity: Activity) => Promise<void>;

async function trackTools(
  calls: AgentProjections['toolCalls'],
  track: TrackActivity,
): Promise<void> {
  for await (const call of calls) {
    const input = await call.input;
    const activity = {
      id: randomUUID(),
      kind: 'tool' as const,
      title: call.name,
      detail: (typeof input === 'string' ? input : JSON.stringify(input))?.slice(0, 500),
      timestamp: new Date().toISOString(),
    };
    await track({ ...activity, status: 'running' });

    let status: Activity['status'];
    try {
      status = (await call.status) === 'error' ? 'failed' : 'completed';
    } catch {
      status = 'failed';
    }
    await track({ ...activity, status });
  }
}

/** Watch every subagent immediately so a slow researcher does not hide later activity. */
async function trackSubagents(
  subagents: AgentProjections['subagents'],
  track: TrackActivity,
  cancel: () => void,
): Promise<void> {
  const watchers: Promise<void>[] = [];
  try {
    for await (const subagent of subagents) {
      const activity = {
        id: randomUUID(),
        kind: 'subagent' as const,
        title: subagent.name,
        timestamp: new Date().toISOString(),
      };
      await track({ ...activity, status: 'running' });
      const watcher = Promise.resolve(subagent.output).then(
        () => track({ ...activity, status: 'completed' }),
        () => track({ ...activity, status: 'failed' }),
      );
      // Observe rejection now, even if the subagent iterator has not finished yet.
      void watcher.catch(cancel);
      watchers.push(watcher);
    }
    await Promise.all(watchers);
  } catch (error) {
    cancel();
    throw error;
  } finally {
    await Promise.allSettled(watchers);
  }
}

/** Drain independent streams concurrently and stop sibling streams before finalizing a failed run. */
export async function consumeRunProjections(
  run: AgentProjections,
  append: (text: string) => Promise<void>,
  track: TrackActivity,
  cancel: () => void,
): Promise<void> {
  const consumers = [
    (async () => {
      for await (const message of run.messages) {
        for await (const delta of message.text) {
          if (delta) await append(delta);
        }
      }
    })(),
    trackTools(run.toolCalls, track),
    trackSubagents(run.subagents, track, cancel),
  ];

  try {
    await Promise.all(consumers);
  } catch (error) {
    cancel();
    await Promise.allSettled(consumers);
    throw error;
  }
}
