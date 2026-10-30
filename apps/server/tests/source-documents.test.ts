import { describe, expect, it, vi } from 'vitest';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { SourceDocumentService } from '../src/ingestion/source-document.service';
import { contentHash } from '../src/ingestion/utils/content-hash';

vi.mock('node:fs/promises', () => ({ mkdir: vi.fn(), writeFile: vi.fn(), rm: vi.fn() }));
const directory = path.resolve(__dirname, '../man_united_data_script');

describe('database source archive', () => {
  it('looks up exact paths in the source archive without filtering by vector publication', async () => {
    const find = vi
      .fn()
      .mockResolvedValue([{ path: 'membership/comparison.md', markdown: 'Full document' }]);
    const service = new SourceDocumentService({ find } as never);
    expect(await service.getByPaths([])).toEqual([]);
    expect(find).not.toHaveBeenCalled();
    expect(
      await service.getByPaths(['membership/comparison.md', 'membership/comparison.md']),
    ).toHaveLength(1);
    const query = find.mock.calls[0][0];
    expect(query.where.path.type).toBe('in');
    expect(query.where.path.value).toEqual(['membership/comparison.md']);
    expect(Object.keys(query.where)).toEqual(['path']);
    expect(query.order).toEqual({ path: 'ASC', source: 'ASC' });
  });

  it('upserts full documents without overwriting the published revision', async () => {
    const upsert = vi.fn().mockResolvedValue(undefined);
    const service = new SourceDocumentService({ upsert } as never);
    const pages = [
      {
        path: 'news/one.md',
        source: 'https://www.manutd.com/en/news/one',
        type: 'news',
        markdown: '# One\nStory',
      },
      {
        path: 'news/two.md',
        source: 'https://www.manutd.com/en/news/two',
        type: 'news',
        markdown: '# Two\nStory',
      },
    ];
    await service.saveBatch(pages);
    expect(upsert).toHaveBeenCalledOnce();
    expect(upsert.mock.calls[0][1]).toEqual(['path', 'source', 'type']);
    expect(upsert.mock.calls[0][0]).toEqual(
      pages.map((page) => ({ ...page, contentHash: contentHash(page.markdown) })),
    );
    expect(upsert.mock.calls[0][0].every((row: object) => !('activeRevision' in row))).toBe(true);
  });

  it('paginates without repeating the last document or loading the complete table', async () => {
    const first = [{ id: '00000000-0000-0000-0000-000000000001' }];
    const second = [{ id: '00000000-0000-0000-0000-000000000002' }];
    const find = vi
      .fn()
      .mockResolvedValueOnce(first)
      .mockResolvedValueOnce(second)
      .mockResolvedValueOnce([]);
    const service = new SourceDocumentService({ find } as never);
    const results = [];
    for await (const batch of service.readBatches()) results.push(batch);
    expect(results).toEqual([first, second]);
    expect(find.mock.calls[0][0]).toEqual({ where: {}, order: { id: 'ASC' }, take: 100 });
    expect(find.mock.calls[1][0].where.id.value).toBe(first[0].id);
    expect(find.mock.calls[1][0].where.id.type).toBe('moreThan');
    expect(find.mock.calls[2][0].where.id.value).toBe(second[0].id);
  });

  it('ignores only capture time when hashing source text', () => {
    expect(contentHash('- captured: yesterday\n# Story')).toBe(
      contentHash('- captured: today\n# Story'),
    );
    expect(contentHash('# Story')).not.toBe(contentHash('# Changed story'));
  });

  it('replaces an outdated comparison source in the same transaction as the new capture', async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    const upsert = vi.fn().mockResolvedValue(undefined);
    const transaction = vi.fn(async (work) =>
      work({ getRepository: () => ({ delete: remove, upsert }) }),
    );
    const service = new SourceDocumentService({ manager: { transaction } } as never);
    const page = {
      path: 'membership/comparison.md',
      source: 'https://www.manutd.com/en/become-a-member-in-2026-27',
      type: 'membership',
      markdown: '# Published tiers',
    };
    await service.saveBatch([page]);
    expect(transaction).toHaveBeenCalledOnce();
    expect(remove.mock.calls[0][0]).toMatchObject({ path: page.path, type: page.type });
    expect(remove.mock.calls[0][0].source.type).toBe('not');
    expect(remove.mock.calls[0][0].source.value).toBe(page.source);
    expect(upsert).toHaveBeenCalledOnce();
  });

  it('removes obsolete database documents while retaining real reports and products', async () => {
    const find = vi.fn().mockResolvedValue([
      {
        id: 'store-list',
        path: 'homepage/store-highlights.md',
        source: 'https://www.manutd.com/en',
      },
      {
        id: 'ticket-list',
        path: 'homepage/tickets-and-tours.md',
        source: 'https://www.manutd.com/en',
      },
      { id: 'highlights', path: 'homepage/highlights.md', source: 'https://www.manutd.com/en' },
      {
        id: 'catalog',
        path: 'store/catalog/kit.md',
        source: 'https://store.manutd.com/en-gb/c/kit',
      },
      {
        id: 'navigation',
        path: 'matches/reports/table.md',
        source: 'https://www.manutd.com/en/matches/mens-team/table',
      },
      {
        id: 'report',
        path: 'matches/reports/report.md',
        source: 'https://www.manutd.com/en/news/report',
      },
    ]);
    const remove = vi.fn();
    const service = new SourceDocumentService({ find, delete: remove } as never);
    await expect(service.removeObsolete()).resolves.toBe(4);
    expect(find.mock.calls[0][0].where).toEqual(
      expect.arrayContaining([
        { path: 'homepage/store-highlights.md' },
        { path: 'homepage/tickets-and-tours.md' },
      ]),
    );
    expect(remove).toHaveBeenCalledWith(['store-list', 'ticket-list', 'catalog', 'navigation']);
  });

  it('recreates the Markdown directory from the archive, keeping the newest source per path', async () => {
    vi.clearAllMocks();
    const order: string[] = [];
    vi.mocked(rm).mockImplementation(async () => void order.push('rm'));
    vi.mocked(writeFile).mockImplementation(async () => void order.push('write'));
    const documents = [
      { id: '1', path: 'news/one.md', markdown: 'Old', updatedAt: new Date('2026-01-01') },
      { id: '2', path: 'news/two.md', markdown: 'Two', updatedAt: new Date('2026-01-01') },
      { id: '3', path: 'news/one.md', markdown: 'New', updatedAt: new Date('2026-02-01') },
      { id: '4', path: 'news/one.md', markdown: 'Stale', updatedAt: new Date('2025-12-01') },
    ];
    const find = vi.fn().mockResolvedValueOnce(documents).mockResolvedValueOnce([]);
    const service = new SourceDocumentService({ find } as never);
    await expect(service.exportMarkdown()).resolves.toEqual({ directory, written: 2 });
    expect(rm).toHaveBeenCalledWith(directory, { recursive: true, force: true });
    expect(order[0]).toBe('rm');
    expect(mkdir).toHaveBeenCalledWith(path.join(directory, 'news'), { recursive: true });
    expect(vi.mocked(writeFile).mock.calls).toEqual([
      [path.join(directory, 'news/one.md'), 'Old', 'utf8'],
      [path.join(directory, 'news/two.md'), 'Two', 'utf8'],
      [path.join(directory, 'news/one.md'), 'New', 'utf8'],
    ]);
  });

  it('refuses to export a document whose path escapes the Markdown directory', async () => {
    vi.clearAllMocks();
    const documents = [{ id: '1', path: '../outside.md', markdown: 'x', updatedAt: new Date() }];
    const find = vi.fn().mockResolvedValueOnce(documents).mockResolvedValueOnce([]);
    const service = new SourceDocumentService({ find } as never);
    await expect(service.exportMarkdown()).rejects.toThrow('escapes the Markdown directory');
    expect(writeFile).not.toHaveBeenCalled();
  });
});
