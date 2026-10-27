import { describe, expect, it, vi } from 'vitest';
import { SourceDocumentService } from '../src/ingestion/source-document.service';
import { contentHash } from '../src/ingestion/utils/content-hash';

describe('database source archive', () => {
  it('looks up exact paths in the source archive without filtering by vector publication', async () => {
    const find = vi.fn().mockResolvedValue([{ path: 'membership/comparison.md', markdown: 'Full document' }]);
    const service = new SourceDocumentService({ getRepository: () => ({ find }) } as never);
    expect(await service.getByPaths([])).toEqual([]);
    expect(find).not.toHaveBeenCalled();
    expect(await service.getByPaths(['membership/comparison.md', 'membership/comparison.md'])).toHaveLength(1);
    const query = find.mock.calls[0][0];
    expect(query.where.path.type).toBe('in');
    expect(query.where.path.value).toEqual(['membership/comparison.md']);
    expect(Object.keys(query.where)).toEqual(['path']);
    expect(query.order).toEqual({ path: 'ASC', source: 'ASC' });
  });

  it('upserts full documents without overwriting the published revision', async () => {
    const upsert = vi.fn().mockResolvedValue(undefined);
    const service = new SourceDocumentService({ getRepository: () => ({ upsert }) } as never);
    const pages = [
      { path: 'news/one.md', source: 'https://www.manutd.com/en/news/one', type: 'news', markdown: '# One\nStory' },
      { path: 'news/two.md', source: 'https://www.manutd.com/en/news/two', type: 'news', markdown: '# Two\nStory' },
    ];
    await service.saveBatch(pages);
    expect(upsert).toHaveBeenCalledOnce();
    expect(upsert.mock.calls[0][1]).toEqual(['path', 'source', 'type']);
    expect(upsert.mock.calls[0][0]).toEqual(pages.map(page => ({ ...page, contentHash: contentHash(page.markdown) })));
    expect(upsert.mock.calls[0][0].every((row: object) => !('activeRevision' in row))).toBe(true);
  });

  it('paginates without repeating the last document or loading the complete table', async () => {
    const first = [{ id: '00000000-0000-0000-0000-000000000001' }];
    const second = [{ id: '00000000-0000-0000-0000-000000000002' }];
    const find = vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second).mockResolvedValueOnce([]);
    const service = new SourceDocumentService({ getRepository: () => ({ find }) } as never);
    const results = [];
    for await (const batch of service.readBatches()) results.push(batch);
    expect(results).toEqual([first, second]);
    expect(find.mock.calls[0][0]).toEqual({ where: {}, order: { id: 'ASC' }, take: 100 });
    expect(find.mock.calls[1][0].where.id.value).toBe(first[0].id);
    expect(find.mock.calls[1][0].where.id.type).toBe('moreThan');
    expect(find.mock.calls[2][0].where.id.value).toBe(second[0].id);
  });

  it('ignores only capture time when hashing source text', () => {
    expect(contentHash('- captured: yesterday\n# Story')).toBe(contentHash('- captured: today\n# Story'));
    expect(contentHash('# Story')).not.toBe(contentHash('# Changed story'));
  });

  it('replaces an outdated comparison source in the same transaction as the new capture', async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    const upsert = vi.fn().mockResolvedValue(undefined);
    const transaction = vi.fn(async work => work({ getRepository: () => ({ delete: remove, upsert }) }));
    const service = new SourceDocumentService({ transaction } as never);
    const page = { path: 'membership/comparison.md', source: 'https://www.manutd.com/en/become-a-member-in-2026-27', type: 'membership', markdown: '# Published tiers' };
    await service.saveBatch([page]);
    expect(transaction).toHaveBeenCalledOnce();
    expect(remove.mock.calls[0][0]).toMatchObject({ path: page.path, type: page.type });
    expect(remove.mock.calls[0][0].source.type).toBe('not');
    expect(remove.mock.calls[0][0].source.value).toBe(page.source);
    expect(upsert).toHaveBeenCalledOnce();
  });

  it('removes obsolete database documents while retaining real reports and products', async () => {
    const find = vi.fn().mockResolvedValue([
      { id: 'store-list', path: 'homepage/store-highlights.md', source: 'https://www.manutd.com/en' },
      { id: 'ticket-list', path: 'homepage/tickets-and-tours.md', source: 'https://www.manutd.com/en' },
      { id: 'highlights', path: 'homepage/highlights.md', source: 'https://www.manutd.com/en' },
      { id: 'catalog', path: 'store/catalog/kit.md', source: 'https://store.manutd.com/en-gb/c/kit' },
      { id: 'navigation', path: 'matches/reports/table.md', source: 'https://www.manutd.com/en/matches/mens-team/table' },
      { id: 'report', path: 'matches/reports/report.md', source: 'https://www.manutd.com/en/news/report' },
    ]);
    const remove = vi.fn();
    const service = new SourceDocumentService({ getRepository: () => ({ find, delete: remove }) } as never);
    await expect(service.removeObsolete()).resolves.toBe(4);
    expect(find.mock.calls[0][0].where).toEqual(expect.arrayContaining([{ path: 'homepage/store-highlights.md' }, { path: 'homepage/tickets-and-tours.md' }]));
    expect(remove).toHaveBeenCalledWith(['store-list', 'ticket-list', 'catalog', 'navigation']);
  });
});
