/** A complete source document, before any vector splitting. */
export type CapturedPage = { path: string; source: string; type: string; markdown: string };
export type MarkdownExtractor = (html: string, source: string) => string;
