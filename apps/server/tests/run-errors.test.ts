import { describe, expect, it, vi } from 'vitest';
import { Logger } from '@nestjs/common';
import { RunService } from '../src/services/run.service';

describe('agent failures', () => {
  it('logs technical details internally but sends only a generic SSE error', async () => {
    const log = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const chats = {
      begin: vi.fn().mockResolvedValue({
        humanId: 'request-1',
        messageId: 'message-1',
        turn: 0,
        edited: false,
      }),
      finish: vi.fn().mockResolvedValue({}),
    };
    const agents = {
      create: vi.fn().mockResolvedValue({
        agent: {
          streamEvents: vi
            .fn()
            .mockRejectedValue(
              new Error(
                '400 Function tools with reasoning_effort are not supported for gpt-6.1-sol',
              ),
            ),
        },
        context: {},
      }),
    };
    const written: unknown[] = [];
    const stream = {
      signal: new AbortController().signal,
      emit: (event: unknown) => written.push(event),
    };
    await new RunService(agents as never, chats as never).run(
      'user-1',
      'thread-1',
      'Question',
      'request-1',
      stream,
    );
    expect(chats.finish).toHaveBeenCalledWith('user-1', 'thread-1', 'message-1', 'failed');
    expect(log).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('Function tools with reasoning_effort'),
    );
    expect(JSON.stringify(written)).toContain(
      'The answer could not be completed. Please try again.',
    );
    expect(JSON.stringify(written)).not.toContain('Function tools with reasoning_effort');
    log.mockRestore();
  });
});
