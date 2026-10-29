import { DEFAULT_PREFERENCES, toMemoryInput } from '@/features/memory/preferences';
import { api } from '@/lib/api';
import type { Memory } from '@united/contracts';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import type { MemoryDraftChanges, MemorySavedHandler } from '../types';

/** Keeps unsaved preferences local; only a successful save updates session memory. */
export function useMemoryEditor(memory: Memory, onSaved: MemorySavedHandler) {
  const [draft, setDraft] = useState(memory);
  const [isSaving, setIsSaving] = useState(false);
  // The ref blocks a second save before React re-renders the disabled form.
  const savingRef = useRef(false);

  function update(changes: MemoryDraftChanges) {
    setDraft((previous) => ({ ...previous, ...changes }));
  }

  /** Restores defaults in the draft only; nothing is saved until the visitor confirms. */
  function reset() {
    setDraft((previous) => ({ ...previous, ...DEFAULT_PREFERENCES }));
  }

  async function save() {
    if (savingRef.current) return;
    savingRef.current = true;
    setIsSaving(true);
    try {
      const saved = await api.saveMemory(toMemoryInput(draft, memory.version));
      onSaved(saved);
      setDraft(saved);
      toast.success('Memory saved');
    } catch {
      // The draft is kept so the visitor can retry without retyping.
      toast.error('Could not save memory. Please try again.');
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }

  return { draft, isSaving, update, reset, save };
}
