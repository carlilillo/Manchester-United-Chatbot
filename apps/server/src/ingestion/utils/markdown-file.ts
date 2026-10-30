import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { CapturedPage } from '../types';

export const MARKDOWN_DIRECTORY = path.resolve(__dirname, '../../../man_united_data_script');

/** Write a document at its archive path, refusing paths that escape the export directory. */
export async function saveMarkdownFile(
  page: Pick<CapturedPage, 'path' | 'markdown'>,
): Promise<string> {
  const destination = path.resolve(MARKDOWN_DIRECTORY, page.path);
  if (!destination.startsWith(`${MARKDOWN_DIRECTORY}${path.sep}`)) {
    throw new Error(`Archive path escapes the Markdown directory: ${page.path}`);
  }
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, page.markdown, 'utf8');
  return destination;
}
