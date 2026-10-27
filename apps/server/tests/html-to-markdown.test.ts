import { describe, expect, it } from 'vitest';
import { htmlToMarkdown } from '../src/ingestion/html-to-markdown';

const baseUrl = 'https://www.manutd.com/en/news/story';

describe('HTML to Markdown', () => {
  it('keeps main content and resolves links, images, lists, and tables', () => {
    const markdown = htmlToMarkdown(`
      <html><head><title>Fallback title</title></head><body>
        <nav>Navigation noise</nav><main>
          <h1>United win</h1><div class="cookieBanner">Cookie noise</div>
          <p>A <strong>good</strong> result. Read <a href="/en/news/next">more</a>.</p>
          <h2>Details</h2><ul><li>First half</li><li>Second half</li></ul>
          <table><tr><th>Team</th><th>Points</th></tr><tr><td>United</td><td>3</td></tr></table>
          <figure><img src="/assets/photo.jpg" alt="Team"/><figcaption>The team</figcaption></figure>
        </main><footer>Footer noise</footer></body></html>`, baseUrl);
    expect(markdown).toContain('# United win');
    expect(markdown).toContain('A **good** result. Read [more](https://www.manutd.com/en/news/next).');
    expect(markdown).toContain('## Details');
    expect(markdown).toContain('- First half');
    expect(markdown).toContain('| United | 3 |');
    expect(markdown).toContain('![Team](https://www.manutd.com/assets/photo.jpg)');
    expect(markdown).toContain('*The team*');
    expect(markdown).not.toMatch(/noise/i);
  });

  it('falls back to readable main text when the page has no semantic blocks', () => {
    expect(htmlToMarkdown('<main><div>Membership options for the coming season</div></main>', baseUrl))
      .toContain('Membership options for the coming season');
  });
});
