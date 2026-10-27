import { describe, expect, it } from 'vitest';
import type { SourceDocumentEntity } from '../src/entities/source-document.entity';
import { splitSourceDocuments } from '../src/vector/utils/split-documents';

const source = (id: string, markdown: string) => ({
  id, markdown, path: `news/${id}.md`, source: `https://www.manutd.com/en/news/${id}`,
  type: 'news', contentHash: `hash-${id}`,
}) as SourceDocumentEntity;

describe('recursive document splitting', () => {
  it('keeps a short document intact across multiple Markdown headings', async () => {
    const text = '# First team\nThe senior squad.\n## Fixtures\nThe next match.\n# Club\nOld Trafford.';
    const chunks = await splitSourceDocuments([source('1', text)], 'revision');
    expect(chunks).toHaveLength(1);
    expect(chunks[0].pageContent).toBe(text);
    expect(chunks[0].metadata.headers).toBeUndefined();
  });

  it('creates bounded, overlapping chunks without adding titles to later chunks', async () => {
    const text = '# Unique title\n' + Array.from({ length: 600 }, (_, index) => `United-${index}`).join(' ');
    const chunks = await splitSourceDocuments([source('1', text)], 'revision');
    expect(chunks.length).toBeGreaterThan(2);
    for (const [index, chunk] of chunks.entries()) {
      expect(chunk.pageContent.length).toBeLessThanOrEqual(1500);
      expect(text).toContain(chunk.pageContent);
      expect(chunk.metadata.chunkIndex).toBe(index);
      if (index > 0) expect(chunk.pageContent).not.toContain('Unique title');
    }
    // Recursive splitting may emit the short heading separately at a newline.
    const bodyChunks = chunks.filter(chunk => !chunk.pageContent.startsWith('#'));
    const firstEnd = text.indexOf(bodyChunks[0].pageContent) + bodyChunks[0].pageContent.length;
    expect(text.indexOf(bodyChunks[1].pageContent)).toBeLessThan(firstEnd);
  });

  it('preserves metadata and resets chunk indexes between database documents', async () => {
    const chunks = await splitSourceDocuments([source('1', 'First document'), source('2', 'Second document')], 'revision');
    expect(chunks.map(chunk => chunk.pageContent)).toEqual(['First document', 'Second document']);
    expect(chunks[1].metadata).toMatchObject({
      sourceDocumentId: '2', path: 'news/2.md', source: 'https://www.manutd.com/en/news/2',
      type: 'news', contentHash: 'hash-2', chunkIndex: 0, revision: 'revision', active: false,
    });
  });

  it('rejects empty stored sources instead of silently dropping them from the rebuilt index', async () => {
    await expect(splitSourceDocuments([source('1', '  ')], 'revision')).rejects.toThrow('Empty source document: news/1.md');
  });
});
