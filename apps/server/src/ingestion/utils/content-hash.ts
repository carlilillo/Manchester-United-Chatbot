import { createHash } from 'node:crypto';

/** Ignore the changing capture timestamp when identifying source content. */
export function contentHash(markdown: string): string {
  const content = markdown.replace(/^- captured: .*\r?\n/m, '');
  return createHash('sha256').update(content).digest('hex');
}
