import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDeepAgent } from 'deepagents';
import { AgentService } from '../src/agent/agent.service';
import { createTestStore } from './helpers/agent-store';
import { buildRuntimePrompt } from '../src/agent/prompts/runtime-prompt';
import type { Memory } from '@united/contracts';

vi.mock('../src/config/env', () => ({ env: () => ({ OPENAI_CHAT_MODEL: 'gpt-6.1-sol', OPENAI_API_KEY: 'test-key' }) }));
vi.mock('deepagents', async importOriginal => ({
  ...await importOriginal<typeof import('deepagents')>(),
  createDeepAgent: vi.fn().mockReturnValue({ name: 'assembled-agent' }),
}));

const preferences: Memory = { enabled: true, responseStyle: 'friendly', notes: 'Use brief answers.', version: 1, updatedAt: null };

/** Provide ready-state dependencies without opening database or model connections. */
function setup(memory = preferences) {
  const vectors = { knowledge: {}, memory: {}, runtimeMemory: vi.fn().mockResolvedValue(memory) };
  const persistence = { setup: vi.fn().mockResolvedValue(undefined), store: createTestStore(), checkpointer: {} };
  const documents = { getByPaths: vi.fn().mockResolvedValue([]) };
  const service = new AgentService(vectors as never, persistence as never, documents as never);
  return { service, vectors, persistence };
}

beforeEach(() => vi.clearAllMocks());

describe('agent harness assembly', () => {
  it('waits for persistence and shares search, skills and backend access with the researcher', async () => {
    const { service, vectors, persistence } = setup();
    const { context } = await service.create('visitor', 'chat');
    expect(persistence.setup).toHaveBeenCalledOnce();
    expect(vectors.runtimeMemory).toHaveBeenCalledWith('visitor');
    expect(context).toEqual({ userId: 'visitor', threadId: 'chat', knowledgeVectorStore: vectors.knowledge, memoryVectorStore: vectors.memory });
    const options = vi.mocked(createDeepAgent).mock.calls[0][0]!;
    expect(options.store).toBe(persistence.store);
    expect(options.checkpointer).toBe(persistence.checkpointer);
    expect(options.tools?.map(tool => tool.name)).toEqual(['search_manchester_united_documentation']);
    const researcher = options.subagents![0];
    expect(researcher).toMatchObject({ skills: ['/skills/'] });
    expect(researcher).toHaveProperty('tools.0', options.tools![0]);
    expect(researcher).toHaveProperty('tools.1.name', 'searchSpecificFile');
    expect(options.permissions).toEqual([{ operations: ['write'], paths: ['/skills/**'], mode: 'deny' }]);
    expect(options.systemPrompt).toContain('Use brief answers.');
    expect(researcher).toMatchObject({ systemPrompt: expect.stringContaining('Use brief answers.') });
    expect(options.model).toHaveProperty('useResponsesApi', true);
  });

  it('does not create a partial harness when persistence initialization fails', async () => {
    const { service, vectors, persistence } = setup();
    persistence.setup.mockRejectedValue(new Error('Database unavailable'));
    await expect(service.create('visitor', 'chat')).rejects.toThrow('Database unavailable');
    expect(vectors.runtimeMemory).not.toHaveBeenCalled();
    expect(createDeepAgent).not.toHaveBeenCalled();
  });

  it('creates separate backends for each conversation using the same durable store', async () => {
    const { service } = setup();
    await service.create('visitor', 'first');
    await service.create('visitor', 'second');
    const first = vi.mocked(createDeepAgent).mock.calls[0][0]!.backend;
    const second = vi.mocked(createDeepAgent).mock.calls[1][0]!.backend;
    expect(first).not.toBe(second);
  });
});

describe('runtime prompt preferences', () => {
  it('adds the current date without misrepresenting it as the capture date', () => {
    const prompt = buildRuntimePrompt('Base prompt', preferences, new Date('2026-10-27T10:00:00Z'));
    expect(prompt).toContain('2026-10-27');
    expect(prompt).toContain('not the archive capture date');
    expect(prompt).toContain('Use brief answers.');
  });

  it('excludes all saved preferences when the visitor disables memory', () => {
    const prompt = buildRuntimePrompt('Base prompt', { ...preferences, enabled: false });
    expect(prompt).not.toContain('Use brief answers.');
    expect(prompt).not.toContain('friendly');
  });
});
