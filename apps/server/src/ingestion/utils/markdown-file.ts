import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { CapturedPage } from '../types';

export const MARKDOWN_DIRECTORY = path.resolve(__dirname, '../../../../../man_united_data_script');

/** Replace a capture atomically, preserving the previous file if writing fails. */
export async function saveMarkdownFile(page: CapturedPage): Promise<string> {
  const destination = path.join(MARKDOWN_DIRECTORY, page.path);
  const temporary = `${destination}.tmp`;
  await mkdir(path.dirname(destination), { recursive: true });
  try {
    await writeFile(temporary, page.markdown, 'utf8');
    await rename(temporary, destination);
  } finally {
    await rm(temporary, { force: true });
  }
  return destination;
}
