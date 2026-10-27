import { ChatOpenAI, type ChatOpenAIFields } from '@langchain/openai';
import { env } from '../../config/env';

/** Use the library model directly, keeping function-tool calls on the Responses API. */
export function createChatModel(fields?: ChatOpenAIFields): ChatOpenAI {
  const options = fields ?? { model: env().OPENAI_CHAT_MODEL, apiKey: env().OPENAI_API_KEY };
  return new ChatOpenAI({ ...options, useResponsesApi: true });
}
