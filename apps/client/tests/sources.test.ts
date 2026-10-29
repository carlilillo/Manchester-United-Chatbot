import { describe, expect, it } from 'vitest';
import { collectSources, sourceTitle } from '../src/features/chat/sources';

describe('answer sources', () => {
  it('lists the sources recorded by the server, never links printed in the answer', () => {
    expect(collectSources({ sources: undefined })).toEqual([]);
    const answer = {
      content: 'See the [fixtures](https://www.manutd.com/en/fixtures).',
      sources: [{ url: 'https://www.manutd.com/club', title: 'The club' }],
    };
    expect(collectSources(answer)).toEqual(answer.sources);
  });

  it('deduplicates by URL, keeps the first title, drops non-web links and names untitled pages', () => {
    expect(
      collectSources({
        sources: [
          { url: 'https://www.manutd.com/squad', title: 'Squad' },
          { url: 'https://www.manutd.com/squad', title: 'Again' },
          { url: 'mailto:fans@example.com', title: 'Email' },
          { url: 'https://www.manutd.com/news', title: '' },
        ],
      }),
    ).toEqual([
      { url: 'https://www.manutd.com/squad', title: 'Squad' },
      { url: 'https://www.manutd.com/news', title: 'manutd.com' },
    ]);
  });

  it('names a source by its hostname when its title is the URL itself', () => {
    expect(sourceTitle('https://www.manutd.com/a', 'https://www.manutd.com/a')).toBe('manutd.com');
  });
});
