import { HumanMessage, type BaseMessage } from '@langchain/core/messages';

/** The parts of a LangGraph state snapshot needed to locate an earlier turn. */
export interface CheckpointSnapshot {
  values: unknown;
  config: { configurable?: { checkpoint_id?: string } };
}

function messagesOf(snapshot: CheckpointSnapshot): BaseMessage[] {
  const values = snapshot.values as { messages?: BaseMessage[] } | undefined;
  return values?.messages ?? [];
}

/**
 * Find the newest checkpoint taken before a question entered the agent's state, so an
 * edited question replays from there. History is read newest first. Questions are matched
 * by id; the question count also covers turns stored before ids were sent to the agent.
 * Returns undefined when the thread has no checkpoint to fork from.
 */
export async function findForkCheckpoint(
  history: AsyncIterable<CheckpointSnapshot>,
  humanId: string,
  turn: number,
): Promise<string | undefined> {
  for await (const snapshot of history) {
    const messages = messagesOf(snapshot);
    const questions = messages.filter((message) => HumanMessage.isInstance(message));
    if (questions.length <= turn && !messages.some((message) => message.id === humanId))
      return snapshot.config.configurable?.checkpoint_id;
  }
  return undefined;
}
