import type { Memory, MemoryInput } from '@united/contracts';

/** Publishes preferences only after the API confirms their saved version. */
export type MemorySavedHandler = (memory: Memory) => void;

/** Editable fields; the version remains controlled by persistence. */
export type MemoryDraftChanges = Partial<Omit<MemoryInput, 'version'>>;
