import { Injectable, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { randomUUID } from 'node:crypto';
import type { Activity, StreamEvent } from '@united/contracts';
import { AgentService } from '../agent/agent.service';
import { ChatService } from './chat.service';

@Injectable()
export class RunService {
  private readonly logger = new Logger(RunService.name);
  constructor(private readonly agents: AgentService, private readonly chats: ChatService) {}

  /** Stream independent agent projections concurrently so subagent activity appears live. */
  async run(userId: string, threadId: string, text: string, requestId: string, res: Response): Promise<void> {
    const messageId = await this.chats.begin(userId, threadId, text, requestId);
    res.status(200).setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    const emit = (event: StreamEvent) => { if (!res.writableEnded) res.write(`data: ${JSON.stringify(event)}\n\n`); };
    emit({ type: 'started', threadId, messageId });
    const abort = new AbortController();
    res.on('close', () => abort.abort());
    try {
      const { agent, context } = await this.agents.create(userId, threadId);
      const run = await agent.streamEvents({ messages: [{ role: 'user', content: text }] }, {
        version: 'v3', configurable: { thread_id: `web:${userId}:${threadId}` },
        context, signal: abort.signal, recursionLimit: 100,
      });
      const track = async (activity: Activity) => {
        await this.chats.activity(userId, threadId, messageId, activity);
        emit({ type: 'activity', messageId, activity });
      };
      await Promise.all([
        (async () => {
          for await (const message of run.messages) {
            for await (const delta of message.text) {
              if (!delta) continue;
              await this.chats.append(userId, threadId, messageId, delta);
              emit({ type: 'delta', messageId, text: delta });
            }
          }
        })(),
        (async () => {
          for await (const call of run.toolCalls) {
            const id = randomUUID();
            const start = new Date().toISOString();
            const input = await call.input;
            const detail = (typeof input === 'string' ? input : JSON.stringify(input))?.slice(0, 500);
            await track({ id, kind: 'tool', title: call.name, detail, status: 'running', timestamp: start });
            try {
              const status = await call.status;
              await track({ id, kind: 'tool', title: call.name, detail, status: status === 'error' ? 'failed' : 'completed', timestamp: start });
            } catch { await track({ id, kind: 'tool', title: call.name, detail, status: 'failed', timestamp: start }); }
          }
        })(),
        (async () => {
          const watchers: Promise<void>[] = [];
          for await (const subagent of run.subagents) {
            const id = randomUUID();
            const start = new Date().toISOString();
            await track({ id, kind: 'subagent', title: subagent.name, status: 'running', timestamp: start });
            watchers.push(Promise.resolve(subagent.output).then(
              () => track({ id, kind: 'subagent', title: subagent.name, status: 'completed', timestamp: start }),
              () => track({ id, kind: 'subagent', title: subagent.name, status: 'failed', timestamp: start }),
            ));
          }
          await Promise.all(watchers);
        })(),
      ]);
      await run.output;
      const final = await this.chats.finish(userId, threadId, messageId, 'complete');
      emit({ type: 'completed', message: final });
    } catch (error) {
      const status = abort.signal.aborted ? 'cancelled' : 'failed';
      if (status === 'failed') this.logger.error(`Agent run failed for thread ${threadId}`, error instanceof Error ? error.stack : String(error));
      await this.chats.finish(userId, threadId, messageId, status);
      if (status === 'failed') emit({ type: 'error', messageId, error: 'The answer could not be completed. Please try again.' });
    } finally { res.end(); }
  }
}
