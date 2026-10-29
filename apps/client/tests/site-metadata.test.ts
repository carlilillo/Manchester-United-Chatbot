import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseSiteUrl, siteMetadata } from '../build/site-metadata';

const html = readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');

describe('static search and sharing metadata', () => {
  it('produces canonical and absolute image URLs without executing React', () => {
    const result = siteMetadata(parseSiteUrl('https://united.example')).transformIndexHtml(html);
    const document = new DOMParser().parseFromString(result.html, 'text/html');
    expect(document.title).toBe('The United Chat | Manchester United Fan Chat');
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toContain(
      'independent fan chatbot',
    );
    expect(document.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe(
      'https://united.example/manchester-united-crest.png',
    );
    expect(document.querySelector('meta[name="twitter:image"]')?.getAttribute('content')).toBe(
      'https://united.example/manchester-united-crest.png',
    );
    expect(result.tags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tag: 'link',
          attrs: { rel: 'canonical', href: 'https://united.example/' },
        }),
        expect.objectContaining({
          tag: 'meta',
          attrs: { property: 'og:url', content: 'https://united.example/' },
        }),
      ]),
    );
    expect(result.html).not.toContain('__SOCIAL_IMAGE_URL__');
  });

  it('keeps local builds usable without publishing a guessed canonical domain', () => {
    const result = siteMetadata(parseSiteUrl(undefined)).transformIndexHtml(html);
    expect(result.tags).toEqual([]);
    expect(result.html).toContain('content="/manchester-united-crest.png"');
  });

  it.each([
    'file:///tmp/site',
    'https://user:password@example.com',
    'https://example.com/chat',
    'https://example.com/?key=value',
    'https://example.com/#chat',
  ])('rejects an unsupported deployment URL: %s', (value) => {
    expect(() => parseSiteUrl(value)).toThrow();
  });
});
