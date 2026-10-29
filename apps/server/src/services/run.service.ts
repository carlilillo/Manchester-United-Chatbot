import { Injectable, Logger } from '@nestjs/common';
import type { RunStream } from '../utils/event-stream';
import { consumeRunProjections } from '../utils/run-projections';
import type { Activity } from '@united/contracts';
import { AgentService } from '../agent/agent.service';
import { ChatService } from './chat.service';

@Injectable()
export class RunService {
  private readonly logger = new Logger(RunService.name);

  constructor(
    private readonly agents: AgentService,
    private readonly chats: ChatService,
  ) {}

  /** Stream independent agent projections concurrently so subagent activity appears live. */
  async run(
    userId: string,
    threadId: string,
    text: string,
    requestId: string,
    stream: RunStream,
  ): Promise<void> {
    const messageId = await this.chats.begin(userId, threadId, text, requestId);
    const emit = (event: Parameters<RunStream['emit']>[0]) => stream.emit(event);
    emit({ type: 'started', threadId, messageId });
    const abort = new AbortController();
    const signal = AbortSignal.any([stream.signal, abort.signal]);
    try {
      const { agent, context, sources } = await this.agents.create(userId, threadId);
      const run = await agent.streamEvents(
        { messages: [{ role: 'user', content: text }] },
        {
          version: 'v3',
          configurable: { thread_id: `web:${userId}:${threadId}` },
          context,
          signal,
          recursionLimit: 100,
        },
      );
      const track = async (activity: Activity) => {
        await this.chats.activity(userId, threadId, messageId, activity);
        emit({ type: 'activity', messageId, activity });
      };
      // Attach an error observer immediately; the final await still propagates the failure.
      void Promise.resolve(run.output).catch(() => undefined);
      await consumeRunProjections(
        run,
        async (delta) => {
          await this.chats.append(userId, threadId, messageId, delta);
          emit({ type: 'delta', messageId, text: delta });
        },
        track,
        () => abort.abort(),
      );
      await run.output;
      // Sources come from the documents the agents read, so the answer need not print links.
      const used = await sources.resolve();
      const final = await this.chats.finish(userId, threadId, messageId, 'complete', used);
      emit({ type: 'completed', message: final });
    } catch (error) {
      const status = stream.signal.aborted ? 'cancelled' : 'failed';
      if (status === 'failed')
        this.logger.error(
          `Agent run failed for thread ${threadId}`,
          error instanceof Error ? error.stack : String(error),
        );
      await this.chats.finish(userId, threadId, messageId, status);
      if (status === 'failed')
        emit({
          type: 'error',
          messageId,
          error: 'The answer could not be completed. Please try again.',
        });
    }
  }
}
