import type { Memory } from '@united/contracts';

/** Return a new default value so callers cannot accidentally modify another visitor's preferences. */
export function memoryFromMetadata(metadata?: Record<string, unknown>): Memory {
  if (!metadata) {
    return { enabled: true, responseStyle: 'friendly', notes: '', version: 0, updatedAt: null };
  }

  return {
    enabled: Boolean(metadata.enabled),
    responseStyle: metadata.responseStyle as Memory['responseStyle'],
    notes: String(metadata.notes ?? ''),
    version: Number(metadata.version),
    updatedAt: String(metadata.updatedAt),
  };
}
