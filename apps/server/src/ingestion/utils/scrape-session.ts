import { Logger } from '@nestjs/common';
import { createConcurrencyLimiter } from './concurrency';
import { fetchJson, fetchPage } from './fetch-page';
import { htmlToMarkdown } from './html-to-markdown';
import type { CapturedPage, MarkdownExtractor } from '../types';
import { batches } from '../../utils/batches';
import { uniqueNameFor } from './source-links';

/** Own fetching, logging, and captures for one run; topic scrapers own extraction rules. */
export class ScrapeSession {
  readonly pages: CapturedPage[] = [];
  readonly logger = new Logger('IngestionScrapers');
  private readonly request = createConcurrencyLimiter(2);
  private readonly seen = new Set<string>();

  constructor(readonly reportError: (message: string) => void) {}

  /** Fetch HTML even when the page is used only to discover detail URLs. */
  async html(source: string, destination: string): Promise<string> {
    this.logger.log(`Fetching: ${source} -> ${destination}`);
    const html = await this.request(() => fetchPage(source));
    this.logger.log(
      `Fetched HTML: ${source} -> ${destination} (${Buffer.byteLength(html, 'utf8')} bytes)`,
    );
    return html;
  }

  /** Log JSON requests separately so standings and player feeds are visible during debugging. */
  async json(source: string, destination: string): Promise<unknown> {
    this.logger.log(`Fetching JSON: ${source} -> ${destination}`);
    const data = await this.request(() => fetchJson(source));
    this.logger.log(`Fetched JSON: ${source} -> ${destination}`);
    return data;
  }

  /** Add provenance once and reject empty conversions rather than indexing placeholders. */
  add(source: string, path: string, type: string, markdown: string): void {
    const content = markdown.trim();
    if (content.length < 50) throw new Error(`Missing meaningful Markdown at ${source}`);
    const provenance = `- source: [Official page](${source})\n- captured: ${new Date().toISOString()}\n\n`;
    this.pages.push({ source, path, type, markdown: provenance + content + '\n' });
  }

  /** Save ordinary page content, isolating failures so other topics can proceed. */
  async capture(
    source: string,
    path: string,
    type: string,
    extract: MarkdownExtractor = htmlToMarkdown,
  ): Promise<string> {
    let html = '';
    try {
      html = await this.html(source, path);
      this.add(source, path, type, extract(html, source));
    } catch (error) {
      this.reportError(`${source}: ${String(error)}`);
    }
    // URL discovery must still work when conversion fails.
    return html;
  }

  /** Capture distinct detail pages in bounded batches, with separate namespaces per topic. */
  async details(
    urls: string[],
    prefix: string,
    type: string,
    extract?: MarkdownExtractor,
  ): Promise<void> {
    const unique = urls.filter((url) => {
      const key = `${prefix}:${url}`;
      if (this.seen.has(key)) return false;
      this.seen.add(key);
      return true;
    });
    for (const batch of batches(unique, 2)) {
      await Promise.all(
        batch.map((url) => this.capture(url, `${prefix}/${uniqueNameFor(url)}.md`, type, extract)),
      );
    }
  }
}
