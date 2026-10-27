import { OpenAIEmbeddings, type OpenAIEmbeddingsParams } from '@langchain/openai';
import { env } from '../../config/env';

/** Share the configured embedding model between knowledge indexing and response preferences. */
export function createEmbeddingModel(fields?: Partial<OpenAIEmbeddingsParams>): OpenAIEmbeddings {
  return new OpenAIEmbeddings(fields ?? {
    model: env().OPENAI_EMBEDDING_MODEL,
    apiKey: env().OPENAI_API_KEY,
  });
}
