import { describe, expect, it } from 'vitest';
import { createTestStore } from './helpers/agent-store';
import { createAgentBackends } from '../src/agent/backends/composite.backend';
import { createStoreBackend } from '../src/agent/backends/store.backend';
import { SKILLS_PERMISSIONS } from '../src/agent/backends/skills.backend';

describe('agent backend routing', () => {
  it('persists files across runs only within the same user and conversation', async () => {
    const store = createTestStore();
    const files = createStoreBackend(store, 'visitor-one', 'chat-one');
    expect(
      await files.write('/retrieved/example.md', 'Evidence for this conversation.'),
    ).not.toHaveProperty('error');
    const resumed = createStoreBackend(store, 'visitor-one', 'chat-one');
    expect(await resumed.read('/retrieved/example.md')).toMatchObject({
      content: expect.stringContaining('Evidence for this conversation.'),
    });
    for (const [user, thread] of [
      ['visitor-two', 'chat-one'],
      ['visitor-one', 'chat-two'],
    ]) {
      expect(
        await createStoreBackend(store, user, thread).read('/retrieved/example.md'),
      ).toHaveProperty('error');
    }
  });

  it('routes skills to the server directory and retrieved files to persistent storage', async () => {
    const { files, backend } = createAgentBackends(createTestStore(), 'visitor', 'chat');
    await files.write('/retrieved/story.md', 'A retrieved story.');
    expect(await backend.read('/retrieved/story.md')).toMatchObject({
      content: expect.stringContaining('A retrieved story.'),
    });
    expect(await backend.read('/skills/people/SKILL.md')).toMatchObject({
      content: expect.stringContaining('United Career'),
    });
    expect(await backend.read('/skills/../package.json')).toHaveProperty('error');
    expect(SKILLS_PERMISSIONS).toEqual([
      { operations: ['write'], paths: ['/skills/**'], mode: 'deny' },
    ]);
  });
});
