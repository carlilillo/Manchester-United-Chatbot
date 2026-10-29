import { Document } from '@langchain/core/documents';
import { describe, expect, it, vi } from 'vitest';
import { createStoreBackend } from '../src/agent/backends/store.backend';
import { markdownTitle } from '../src/agent/sources/markdown-title';
import { SourceCollector } from '../src/agent/sources/source-collector';
import { createSearchSpecificFileTool } from '../src/agent/tools/search-specific-file.tool';
import { createSearchTool } from '../src/agent/tools/search.tool';
import { ChatService } from '../src/services/chat.service';
import { RunService } from '../src/services/run.service';
import { createTestStore } from './helpers/agent-store';

const profile = {
  path: 'people/men/bruno.md',
  source: 'https://www.manutd.com/en/teams/mens-team/bruno-fernandes',
  type: 'people',
  markdown:
    '- source: [Official page](https://www.manutd.com)\n\n# Bruno Fernandes\n\n## United Career',
};
const standings = {
  path: 'matches/standings-men-premier-league.md',
  source: 'https://www.manutd.com/en/matches/mens-team/table/premier-league',
  type: 'matches',
  markdown: '- captured: 2026-10-27\n\n# Premier League table\n\n| Pos | Team |',
};

const chunk = (metadata: Record<string, unknown>, chunkIndex = 2) =>
  new Document({
    pageContent: 'United Career\n- Goals: 111',
    metadata: { ...metadata, chunkIndex },
  });

/** Wires a collector to a real conversation backend and the search tool, as AgentService does. */
function setup(records = [profile, standings]) {
  const getByPaths = vi.fn(async (paths: string[]) =>
    records.filter((record) => paths.includes(record.path)),
  );
  const sources = new SourceCollector({ getByPaths });
  const files = createStoreBackend(createTestStore(), 'visitor', 'chat', sources.markRead);
  return { sources, files, getByPaths };
}

const excerptPaths = (result: unknown) =>
  [...String(result).matchAll(/File: (\/retrieved\/[^\s]+)/g)].map((match) => match[1]);

describe('archive document titles', () => {
  it('reads the first level-one heading after capture metadata', () => {
    expect(markdownTitle(profile.markdown)).toBe('Bruno Fernandes');
    expect(markdownTitle('## Only a subsection')).toBeUndefined();
  });
});

describe('answer sources', () => {
  it('lists an excerpt only once an agent reads it, titled from its archived document', async () => {
    const { sources, files, getByPaths } = setup();
    const search = createSearchTool(
      {
        similaritySearchWithScore: vi.fn().mockResolvedValue([
          [chunk(profile), 0.1],
          [chunk(standings), 0.3],
        ]),
      },
      files,
      sources,
    );
    const [read] = excerptPaths(await search.invoke({ query: 'Bruno goals' }));
    expect(await sources.resolve()).toEqual([]);

    await files.read(read);
    expect(await sources.resolve()).toEqual([{ url: profile.source, title: 'Bruno Fernandes' }]);
    expect(getByPaths).toHaveBeenLastCalledWith([profile.path]);
  });

  it('records complete documents and lists each page once, in order of first use', async () => {
    const { sources, files } = setup();
    const search = createSearchTool(
      {
        similaritySearchWithScore: vi.fn().mockResolvedValue([
          [chunk(profile, 1), 0.1],
          [chunk(profile, 2), 0.2],
        ]),
      },
      files,
      sources,
    );
    const lookup = createSearchSpecificFileTool({ getByPaths: async () => [standings] }, sources);
    await lookup.invoke({ file_paths: [standings.path] });
    for (const path of excerptPaths(await search.invoke({ query: 'Bruno' })))
      await files.read(path);

    expect(await sources.resolve()).toEqual([
      { url: standings.source, title: 'Premier League table' },
      { url: profile.source, title: 'Bruno Fernandes' },
    ]);
  });

  it('ignores failed reads, non-web sources and other working files', async () => {
    const { sources, files } = setup();
    sources.registerExcerpt('/retrieved/missing.md', { url: profile.source, path: profile.path });
    await files.read('/retrieved/missing.md');
    await files.write('/notes.md', 'scratch');
    await files.read('/notes.md');
    sources.markUsed({ url: 'mailto:club@example.com', path: 'x.md', title: 'Email' });
    expect(await sources.resolve()).toEqual([]);
  });

  it('keeps the answer when a title cannot be looked up', async () => {
    const sources = new SourceCollector({
      getByPaths: vi.fn().mockRejectedValue(new Error('Database unavailable')),
    });
    sources.markUsed({ url: profile.source, path: profile.path });
    expect(await sources.resolve()).toEqual([{ url: profile.source, title: '' }]);
  });
});

describe('completed runs', () => {
  const empty = { async *[Symbol.asyncIterator]() {} };

  it('saves the resolved sources on the finished answer', async () => {
    const resolved = [{ url: profile.source, title: 'Bruno Fernandes' }];
    const chats = {
      begin: vi.fn().mockResolvedValue('message-1'),
      finish: vi.fn().mockResolvedValue({ id: 'message-1', sources: resolved }),
    };
    const agents = {
      create: vi.fn().mockResolvedValue({
        agent: {
          streamEvents: vi.fn().mockResolvedValue({
            messages: empty,
            toolCalls: empty,
            subagents: empty,
            output: Promise.resolve(),
          }),
        },
        context: {},
        sources: { resolve: vi.fn().mockResolvedValue(resolved) },
      }),
    };
    const written: unknown[] = [];
    await new RunService(agents as never, chats as never).run('user', 'thread', 'Q', 'request', {
      signal: new AbortController().signal,
      emit: (event: unknown) => written.push(event),
    });
    expect(chats.finish).toHaveBeenCalledWith('user', 'thread', 'message-1', 'complete', resolved);
    expect(written).toContainEqual({
      type: 'completed',
      message: { id: 'message-1', sources: resolved },
    });
  });

  it('stores sources on the answer but leaves them off when none were used', async () => {
    const chat = {
      userId: 'owner',
      threadId: 'thread',
      messages: [
        { id: 'a', role: 'ai', status: 'streaming' },
        { id: 'b', role: 'ai', status: 'streaming' },
      ],
      status: 'running',
      version: 0,
    };
    const repository = {
      findOne: vi.fn().mockResolvedValue(chat),
      save: vi.fn(async (value) => value),
    };
    const service = new ChatService({
      manager: {
        transaction: (work: (manager: unknown) => unknown) =>
          work({ getRepository: () => repository }),
      },
    } as never);
    const resolved = [{ url: profile.source, title: 'Bruno Fernandes' }];
    expect(await service.finish('owner', 'thread', 'a', 'complete', resolved)).toMatchObject({
      status: 'complete',
      sources: resolved,
    });
    expect(await service.finish('owner', 'thread', 'b', 'complete', [])).not.toHaveProperty(
      'sources',
    );
  });
});
