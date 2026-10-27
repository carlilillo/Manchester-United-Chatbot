import { randomUUID } from 'node:crypto';
import type { Document } from '@langchain/core/documents';
import type { PGVectorStore } from '@langchain/pgvector';
import type { StoreBackend } from 'deepagents';
import { tool, type ToolRuntime } from 'langchain';
import { z } from 'zod';
import type { AgentContext } from '../agent.context';

const RESULT_LIMIT = 8;
const searchSchema = z.object({
  query: z.string().trim().min(1).describe('A focused question including names, team, competition or dates when relevant.'),
  source: z.enum(['homepage', 'news', 'videos', 'store', 'matches', 'people', 'membership', 'travel'])
    .optional().describe('Restrict results to one archived topic; omit to search all topics.'),
});
type SearchInput = z.infer<typeof searchSchema>;
type KnowledgeSearch = Pick<PGVectorStore, 'similaritySearchWithScore'>;
type RetrievedFiles = Pick<StoreBackend, 'write'>;

/** Keep source provenance beside each chunk, including chunks without the original document header. */
function retrievedMarkdown(document: Document): string {
  const metadata = document.metadata;
  return [
    '# Retrieved archive excerpt',
    `- Source: ${metadata.source ?? 'Not supplied'}`,
    `- Archive path: ${metadata.path ?? 'Not supplied'}`,
    `- Topic: ${metadata.type ?? 'Not supplied'}`,
    ...(typeof metadata.chunkIndex === 'number' ? [`- Chunk: ${metadata.chunkIndex}`] : []),
    '', '## Content', '', document.pageContent,
  ].join('\n');
}

/** Search the published index and expose readable excerpts to both agents in their shared backend. */
export function createSearchTool(knowledge: KnowledgeSearch, files: RetrievedFiles) {
  return tool(async ({ query, source }: SearchInput, runtime: ToolRuntime<unknown, AgentContext>) => {
    const store = runtime.context?.knowledgeVectorStore ?? knowledge;
    const filter: Record<string, string | boolean> = { active: true };
    if (source) filter.type = source;
    const results = await store.similaritySearchWithScore(query, RESULT_LIMIT, filter);
    if (!results.length) return 'No relevant archived documents were found. Refine the query or explain the evidence gap; do not invent current information.';

    // A fresh directory avoids write collisions when a follow-up search returns the same chunks.
    const retrievalId = randomUUID();
    const references: string[] = [];
    for (const [index, [document, distance]] of results.entries()) {
      const virtualPath = `/retrieved/${retrievalId}/${index + 1}.md`;
      const result = await files.write(virtualPath, retrievedMarkdown(document));
      if (result.error) throw new Error(`Could not save retrieved excerpt ${virtualPath}: ${result.error}`);
      references.push([
        `- File: ${virtualPath}`,
        `  Source: ${document.metadata.source ?? 'Not supplied'}`,
        `  Archive path: ${document.metadata.path ?? 'Not supplied'}`,
        `  Distance: ${distance}`,
      ].join('\n'));
    }
    return ['Read these excerpt files with read_file before using them as evidence.', ...references].join('\n\n');
  }, {
    name: 'search_manchester_united_documentation',
    description: 'Search archived official Manchester United sources by meaning, optionally filtered by topic. Returns up to eight excerpt file paths and their official source links. Read the files with read_file; these are chunks, not complete documents or live pages. Search again for missing details.',
    schema: searchSchema,
  });
}
