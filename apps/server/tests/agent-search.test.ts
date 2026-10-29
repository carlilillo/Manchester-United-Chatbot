import { describe, expect, it, vi } from 'vitest';
import { Document } from '@langchain/core/documents';
import { createTestStore } from './helpers/agent-store';
import { createStoreBackend } from '../src/agent/backends/store.backend';
import { createSearchTool } from '../src/agent/tools/search.tool';

const document = new Document({
  id: 'same-chunk',
  pageContent: 'United Career\n- Goals: 111',
  metadata: {
    source: 'https://www.manutd.com/en/teams/mens-team/bruno-fernandes',
    path: 'people/men/bruno.md',
    type: 'people',
    chunkIndex: 2,
  },
});

describe('semantic archive search', () => {
  it('filters active sources and writes readable excerpts with provenance to the conversation backend', async () => {
    const files = createStoreBackend(createTestStore(), 'visitor', 'chat');
    const similaritySearchWithScore = vi.fn().mockResolvedValue([[document, 0.12]]);
    const search = createSearchTool({ similaritySearchWithScore }, files);
    const result = String(
      await search.invoke({ query: '  Bruno career goals  ', source: 'people' }),
    );
    expect(similaritySearchWithScore).toHaveBeenCalledWith('Bruno career goals', 8, {
      active: true,
      type: 'people',
    });
    const file = /File: (\/retrieved\/[^\s]+)/.exec(result)![1];
    const saved = await files.read(file);
    expect(saved).toMatchObject({ content: expect.stringContaining('United Career') });
    expect(saved).toMatchObject({
      content: expect.stringContaining('https://www.manutd.com/en/teams/mens-team/bruno-fernandes'),
    });
    expect(saved).toMatchObject({ content: expect.stringContaining('Chunk: 2') });
    expect(result).toContain('Read these excerpt files with read_file');
  });

  it('does not collide when repeated searches retrieve the same chunk', async () => {
    const files = createStoreBackend(createTestStore(), 'visitor', 'chat');
    const search = createSearchTool(
      { similaritySearchWithScore: vi.fn().mockResolvedValue([[document, 0.2]]) },
      files,
    );
    const first = String(await search.invoke({ query: 'Bruno' }));
    const second = String(await search.invoke({ query: 'Bruno' }));
    const path = (result: string) => /File: (\/retrieved\/[^\s]+)/.exec(result)![1];
    expect(path(first)).not.toBe(path(second));
    expect(await files.read(path(first))).not.toHaveProperty('error');
    expect(await files.read(path(second))).not.toHaveProperty('error');
  });

  it('uses the server-provided runtime store when present', async () => {
    const fallback = { similaritySearchWithScore: vi.fn().mockResolvedValue([]) };
    const runtimeStore = { similaritySearchWithScore: vi.fn().mockResolvedValue([]) };
    const search = createSearchTool(fallback, { write: vi.fn() });
    await search.invoke(
      { query: 'Latest news' },
      { context: { knowledgeVectorStore: runtimeStore } },
    );
    expect(runtimeStore.similaritySearchWithScore).toHaveBeenCalledWith('Latest news', 8, {
      active: true,
    });
    expect(fallback.similaritySearchWithScore).not.toHaveBeenCalled();
  });

  it('reports no results and never advertises a file that could not be written', async () => {
    const lookup = vi.fn().mockResolvedValue([]);
    const write = vi.fn().mockResolvedValue({ error: 'Storage unavailable' });
    const search = createSearchTool({ similaritySearchWithScore: lookup }, { write });
    expect(await search.invoke({ query: 'Unknown story' })).toContain(
      'No relevant archived documents',
    );
    expect(write).not.toHaveBeenCalled();
    lookup.mockResolvedValue([[document, 0.2]]);
    await expect(search.invoke({ query: 'Bruno' })).rejects.toThrow('Storage unavailable');
  });

  it('rejects blank queries and unsupported topics before searching', async () => {
    const lookup = vi.fn();
    const search = createSearchTool({ similaritySearchWithScore: lookup }, { write: vi.fn() });
    await expect(search.invoke({ query: '   ' })).rejects.toThrow();
    await expect(search.invoke({ query: 'Shirt', source: 'catalog' } as never)).rejects.toThrow();
    expect(lookup).not.toHaveBeenCalled();
  });
});
