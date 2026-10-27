import { OpenAIEmbeddings, type OpenAIEmbeddingsParams } from '@langchain/openai';
import { env } from '../../config/env';

export const OPENAI_EMBEDDING_MODEL = 'text-embedding-3-large';

/** Share the fixed embedding model between knowledge indexing and response preferences. */
export function createEmbeddingModel(fields?: Partial<Omit<OpenAIEmbeddingsParams, 'model' | 'modelName'>>): OpenAIEmbeddings {
  return new OpenAIEmbeddings({
    ...(fields ?? { apiKey: env().OPENAI_API_KEY }),
    model: OPENAI_EMBEDDING_MODEL,
  });
}
