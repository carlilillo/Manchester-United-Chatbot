import { tool } from 'langchain';
import { z } from 'zod';
import type { SourceDocumentService } from '../../ingestion/source-document.service';

const archivePath = z.string().trim().regex(
  /^(?:[a-zA-Z0-9_-]+\/)+[a-zA-Z0-9_-]+\.md$/,
  'Use a relative archive Markdown path, such as matches/standings-men-premier-league.md.',
);

/** Read complete database documents for known paths without semantic ranking or chunk truncation. */
export function createSearchSpecificFileTool(documents: Pick<SourceDocumentService, 'getByPaths'>) {
  return tool(async ({ file_paths }) => {
    const paths = [...new Set(file_paths)];
    const records = await documents.getByPaths(paths);
    return paths.map(path => {
      const matches = records.filter(record => record.path === path);
      if (!matches.length) return `Archive path: ${path}\nNo archived document exists at this path. Use semantic search to discover another source.`;
      // Preserve every source when more than one record shares an archive path.
      return matches.map(record => [
        `Archive path: ${record.path}`,
        `Official source: ${record.source}`,
        `Topic: ${record.type}`,
        '', record.markdown,
      ].join('\n')).join('\n\n---\n\n');
    }).join('\n\n---\n\n');
  }, {
    name: 'searchSpecificFile',
    description: 'Read complete ingested Markdown documents by exact relative archive paths. Use for standings, fixtures/results, numbered news pages, membership comparisons and known roster/listing files. Returns full content with source URLs and explicit missing-file messages. Reads the latest ingested database archive, which may be newer than the vector index. It does not access local files or live websites.',
    schema: z.object({
      file_paths: z.array(archivePath).min(1).max(10)
        .describe('One to ten archive paths supplied by topic skills or search metadata; do not use /retrieved/ paths or URLs.'),
    }),
  });
}
