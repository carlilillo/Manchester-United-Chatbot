import { Document } from '@langchain/core/documents';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import type { SourceDocumentEntity } from '../../entities/source-document.entity';

const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1500, chunkOverlap: 300 });

/** Split stored text as-is; retain source metadata without prepending headings or titles. */
export async function splitSourceDocuments(sources: SourceDocumentEntity[], revision: string): Promise<Document[]> {
  const documents = sources.map(source => {
    if (!source.markdown.trim()) throw new Error(`Empty source document: ${source.path}`);
    return new Document({
      pageContent: source.markdown,
      metadata: {
        sourceDocumentId: source.id,
        path: source.path,
        source: source.source,
        type: source.type,
        contentHash: source.contentHash,
        revision,
        active: false,
      },
    });
  });
  const chunks = await splitter.splitDocuments(documents);
  const nextIndex = new Map<string, number>();
  for (const chunk of chunks) {
    const sourceId = chunk.metadata.sourceDocumentId as string;
    const index = nextIndex.get(sourceId) ?? 0;
    chunk.metadata.chunkIndex = index;
    nextIndex.set(sourceId, index + 1);
  }
  return chunks;
}
