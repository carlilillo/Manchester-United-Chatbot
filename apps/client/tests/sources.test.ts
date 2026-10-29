import { describe, expect, it } from 'vitest';
import { collectSources, linksFromMarkdown, sourceTitle } from '../src/features/chat/sources';

describe('answer sources', () => {
  it('collects cited links and bare URLs, ignoring images and code', () => {
    const content = [
      'See the [fixtures](https://www.manutd.com/en/fixtures) and https://www.premierleague.com/tables.',
      '![Crest](https://www.manutd.com/crest.png)',
      '`https://example.com/in-code`',
      '```\nhttps://example.com/in-block\n```',
    ].join('\n\n');
    expect(linksFromMarkdown(content).map((link) => link.url)).toEqual([
      'https://www.manutd.com/en/fixtures',
      'https://www.premierleague.com/tables',
    ]);
  });

  it('deduplicates by URL, keeps the first title, and drops non-web links', () => {
    const content =
      '[Squad](https://www.manutd.com/squad), [again](https://www.manutd.com/squad), ' +
      '[email](mailto:fans@example.com) and [](https://www.manutd.com/news).';
    expect(collectSources({ content })).toEqual([
      { url: 'https://www.manutd.com/squad', title: 'Squad' },
      { url: 'https://www.manutd.com/news', title: 'manutd.com' },
    ]);
  });

  it('prefers structured sources from the API over links in the text', () => {
    const sources = [{ url: 'https://www.manutd.com/club', title: 'The club' }];
    expect(collectSources({ content: '[Other](https://example.com)', sources })).toEqual(sources);
  });

  it('names a link by its hostname when its text is the URL itself', () => {
    expect(sourceTitle('https://www.manutd.com/a', 'https://www.manutd.com/a')).toBe('manutd.com');
  });
});
