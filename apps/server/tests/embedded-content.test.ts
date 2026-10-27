import { describe, expect, it } from 'vitest';
import { htmlToMarkdown } from '../src/ingestion/html-to-markdown';

describe('embedded article content', () => {
  it('uses Next.js server payload prose when static HTML omits the article body', () => {
    const article = {
      articleTitle: 'Match report', summary: 'United earned three points',
      bodyCopy: { json: { nodeType: 'document', content: [
        { nodeType: 'heading-2', content: [{ nodeType: 'text', value: 'First half' }] },
        { nodeType: 'paragraph', content: [{ nodeType: 'text', value: 'The opening goal arrived early.' }] },
      ] } },
    };
    const payload = `0:${JSON.stringify({ item: article })}\n`;
    const html = `<html><body><main><h1>Match report</h1></main><script>self.__next_f.push(${JSON.stringify([1, payload])})</script></body></html>`;
    const markdown = htmlToMarkdown(html, 'https://www.manutd.com/en/news/report');
    expect(markdown).toContain('# Match report');
    expect(markdown).toContain('United earned three points');
    expect(markdown).toContain('## First half');
    expect(markdown).toContain('The opening goal arrived early.');
  });
});
