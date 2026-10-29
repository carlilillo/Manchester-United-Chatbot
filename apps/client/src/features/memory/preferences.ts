import { responseStyleSchema, type Memory, type MemoryInput } from '@united/contracts';

/** Editable preferences; the version and timestamp belong to persistence. */
export type MemoryPreferences = Pick<Memory, 'enabled' | 'responseStyle' | 'notes'>;

/** Values restored by "Restore defaults"; they match a new visitor's memory. */
export const DEFAULT_PREFERENCES: MemoryPreferences = {
  enabled: true,
  responseStyle: 'friendly',
  notes: '',
};

/** Matches the API's notes limit. */
export const MAX_NOTES_LENGTH = 4000;

/** Tone options in display order, derived from the shared contract. */
export const RESPONSE_STYLES = responseStyleSchema.options;

export const RESPONSE_STYLE_LABELS: Record<Memory['responseStyle'], string> = {
  formal: 'Formal',
  friendly: 'Friendly',
  funny: 'Funny',
};

/** Builds the save payload; `version` lets the API reject a stale overwrite. */
export function toMemoryInput(draft: MemoryPreferences, version: number): MemoryInput {
  return {
    enabled: draft.enabled,
    responseStyle: draft.responseStyle,
    notes: draft.notes,
    version,
  };
}
