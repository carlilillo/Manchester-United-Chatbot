import { readFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { MARKDOWN_DIRECTORY } from './markdown-file';
import { isNewsArticle } from './source-links';

export const RETIRED_HOMEPAGE_PATHS = [
  'homepage/store-highlights.md',
  'homepage/tickets-and-tours.md',
];

/** Identify retired homepage lists and documents produced by the former catalog/navigation crawler. */
export function isObsoleteCapture(file: string, source: string): boolean {
  if (RETIRED_HOMEPAGE_PATHS.includes(file)) return true;
  if (file.startsWith('store/catalog/')) return true;
  if (!file.startsWith('matches/reports/') && !file.startsWith('news/articles/')) return false;
  try {
    return !isNewsArticle(new URL(source));
  } catch {
    return false;
  }
}

/** Remove retired generated files, preserving the reference archive. */
export async function removeObsoleteFiles(log: (message: string) => void): Promise<void> {
  for (const file of RETIRED_HOMEPAGE_PATHS) {
    await rm(path.join(MARKDOWN_DIRECTORY, file), { force: true });
    log(`Retired capture: ${file}`);
  }
  await rm(path.join(MARKDOWN_DIRECTORY, 'store/catalog'), { recursive: true, force: true });
  for (const folder of ['matches/reports', 'news/articles']) {
    const directory = path.join(MARKDOWN_DIRECTORY, folder);
    let names: string[];
    try {
      names = await readdir(directory);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
      throw error;
    }
    for (const name of names.filter((name) => name.endsWith('.md'))) {
      const file = path.join(directory, name);
      const markdown = await readFile(file, 'utf8');
      const source = /^- source: \[Official page\]\(([^\n]+)\)/m.exec(markdown)?.[1];
      if (source && isObsoleteCapture(`${folder}/${name}`, source)) {
        await rm(file);
        log(`Removed obsolete capture: ${folder}/${name}`);
      }
    }
  }
}
