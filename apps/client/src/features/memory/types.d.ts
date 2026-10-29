import type { Memory } from '@united/contracts';
import type { MemoryPreferences } from './preferences';

/** Publishes preferences only after the API confirms their saved version. */
export type MemorySavedHandler = (memory: Memory) => void;

/** Editable fields; the version remains controlled by persistence. */
export type MemoryDraftChanges = Partial<MemoryPreferences>;
