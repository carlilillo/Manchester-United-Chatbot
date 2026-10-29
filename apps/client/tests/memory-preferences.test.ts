import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PREFERENCES,
  RESPONSE_STYLE_LABELS,
  RESPONSE_STYLES,
  toMemoryInput,
} from '../src/features/memory/preferences';

describe('memory preferences', () => {
  it('sends only editable fields with the version the draft was based on', () => {
    const draft = { ...DEFAULT_PREFERENCES, notes: 'Short answers', updatedAt: 'ignored' };
    expect(toMemoryInput(draft, 3)).toEqual({
      enabled: true,
      responseStyle: 'friendly',
      notes: 'Short answers',
      version: 3,
    });
  });

  it('labels every tone defined by the shared contract', () => {
    expect(RESPONSE_STYLES).toEqual(['formal', 'friendly', 'funny']);
    for (const style of RESPONSE_STYLES) expect(RESPONSE_STYLE_LABELS[style]).toBeTruthy();
  });
});
