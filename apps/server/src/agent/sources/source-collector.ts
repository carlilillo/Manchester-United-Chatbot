import type { ChatMessage } from '@united/contracts';
import type { SourceDocumentService } from '../../ingestion/source-document.service';
import { markdownTitle } from './markdown-title';

/** Provenance of one archived document; the title may be resolved later. */
export interface ArchiveSource {
  url: string;
  path: string;
  title?: string;
}

/** The shape stored on an answer and shown to the visitor. */
export type MessageSource = NonNullable<ChatMessage['sources']>[number];

type TitleLookup = Pick<SourceDocumentService, 'getByPaths'>;

/** Only official web pages are listed; anything else is not a source a visitor can open. */
function isWebUrl(url: string): boolean {
  try {
    const { protocol } = new URL(url);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

const key = (path: string, url: string) => `${path}\n${url}`;

/**
 * Records the archived documents the agents actually used during one run, so an
 * answer lists its sources without the model printing links. A search excerpt
 * counts once an agent reads it with read_file; a complete document counts when
 * searchSpecificFile returns it. Search hits that are never read are not listed.
 */
export class SourceCollector {
  /** Retrieved excerpt files and the document each came from. */
  private readonly excerpts = new Map<string, ArchiveSource>();
  /** Used documents by URL, in the order the agents first used them. */
  private readonly used = new Map<string, ArchiveSource>();

  constructor(private readonly documents: TitleLookup) {}

  /** Remembers which document a retrieved excerpt file belongs to. */
  registerExcerpt(filePath: string, source: ArchiveSource): void {
    this.excerpts.set(filePath, source);
  }

  /** Read hook for the conversation backend; files other than excerpts are ignored. */
  readonly markRead = (filePath: string): void => {
    const source = this.excerpts.get(filePath);
    if (source) this.markUsed(source);
  };

  /** Several excerpts often share a page, so each URL is listed once; a later title fills a missing one. */
  markUsed(source: ArchiveSource): void {
    if (!isWebUrl(source.url)) return;
    const existing = this.used.get(source.url);
    if (!existing) this.used.set(source.url, { ...source });
    else if (!existing.title && source.title) existing.title = source.title;
  }

  /**
   * Returns the used sources, filling missing titles from the archived
   * documents' headings in one query. Title lookup is best effort: if it fails,
   * untitled sources keep an empty title and the client names them by hostname.
   */
  async resolve(): Promise<MessageSource[]> {
    const sources = [...this.used.values()];
    const titles = new Map<string, string>();
    const untitled = [...new Set(sources.filter((source) => !source.title).map((source) => source.path))];
    if (untitled.length) {
      try {
        for (const record of await this.documents.getByPaths(untitled)) {
          const title = markdownTitle(record.markdown);
          if (title) titles.set(key(record.path, record.source), title);
        }
      } catch {
        // A finished answer must not fail because a heading could not be looked up.
      }
    }
    return sources.map((source) => ({
      url: source.url,
      title: source.title ?? titles.get(key(source.path, source.url)) ?? '',
    }));
  }
}
