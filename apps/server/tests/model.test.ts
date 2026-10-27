import { describe, expect, it } from 'vitest';
import { createChatModel } from '../src/agent/model/chat-model';

describe('agent model request transport', () => {
  it('routes gpt-6.1-sol tool calls through Responses with supported reasoning', () => {
    const model = createChatModel({ model: 'gpt-6.1-sol', apiKey: 'test-key' });
    const params = model.invocationParams({
      reasoning: { effort: 'medium' },
      tools: [{ type: 'function', function: { name: 'lookup', description: 'Find a document', parameters: { type: 'object', properties: {} } } }],
    });

    expect(model.useResponsesApi).toBe(true);
    expect(params).toHaveProperty('reasoning', { effort: 'medium' });
    expect(params).not.toHaveProperty('reasoning_effort');
    expect(params).toHaveProperty('tools.0.type', 'function');
  });

  it('preserves the Responses route in configured copies used by LangChain', () => {
    const configured = createChatModel({ model: 'gpt-6.1-sol', apiKey: 'test-key' }).withConfig({ tags: ['agent'] });
    expect(configured).toHaveProperty('useResponsesApi', true);
  });
});

describe('embedding model configuration', () => {
  it('uses the library embedding model and explicit settings without making an API call', async () => {
    const { createEmbeddingModel } = await import('../src/agent/model/embedding-model');
    const model = createEmbeddingModel({ model: 'text-embedding-3-large', apiKey: 'test-key' });
    expect(model.model).toBe('text-embedding-3-large');
  });
});
