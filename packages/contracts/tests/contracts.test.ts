import { describe, expect, it } from 'vitest';
import { memoryInputSchema, streamEventSchema } from '../src/index.js';

describe('shared wire contracts', () => {
  it('accepts supported memory styles and rejects unbounded notes', () => {
    expect(memoryInputSchema.parse({ enabled: true, responseStyle: 'funny', notes: 'Be brief', version: 0 }).responseStyle).toBe('funny');
    expect(memoryInputSchema.safeParse({ enabled: true, responseStyle: 'angry', notes: '', version: 0 }).success).toBe(false);
    expect(memoryInputSchema.safeParse({ enabled: true, responseStyle: 'formal', notes: 'x'.repeat(4001), version: 0 }).success).toBe(false);
  });
  it('discriminates streaming events', () => {
    expect(streamEventSchema.parse({ type: 'delta', messageId: 'm', text: 'Hi' }).type).toBe('delta');
    expect(streamEventSchema.safeParse({ type: 'delta', messageId: 'm' }).success).toBe(false);
  });
});
