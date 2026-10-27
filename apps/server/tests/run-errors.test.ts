import { describe, expect, it, vi } from 'vitest';
import { Logger } from '@nestjs/common';
import { RunService } from '../src/services/run.service';

describe('agent failures', () => {
  it('logs technical details internally but sends only a generic SSE error', async () => {
    const log = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const chats = { begin: vi.fn().mockResolvedValue('message-1'), finish: vi.fn().mockResolvedValue({}) };
    const agents = { create: vi.fn().mockResolvedValue({
      agent: { streamEvents: vi.fn().mockRejectedValue(new Error('400 Function tools with reasoning_effort are not supported for gpt-6.1-sol')) },
      context: {},
    }) };
    const written: string[] = [];
    const response = {
      writableEnded: false,
      status: vi.fn().mockReturnThis(), setHeader: vi.fn().mockReturnThis(), flushHeaders: vi.fn(),
      on: vi.fn(), write: (value: string) => written.push(value), end: vi.fn(),
    };
    await new RunService(agents as never, chats as never).run('user-1', 'thread-1', 'Question', 'request-1', response as never);
    expect(chats.finish).toHaveBeenCalledWith('user-1', 'thread-1', 'message-1', 'failed');
    expect(log).toHaveBeenCalledWith(expect.any(String), expect.stringContaining('Function tools with reasoning_effort'));
    expect(written.join('')).toContain('The answer could not be completed. Please try again.');
    expect(written.join('')).not.toContain('Function tools with reasoning_effort');
    log.mockRestore();
  });
});
