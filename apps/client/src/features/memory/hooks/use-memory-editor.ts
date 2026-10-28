import { api } from '@/lib/api';
import type { Memory } from '@united/contracts';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import type { MemoryDraftChanges, MemorySavedHandler } from '../types';

/** Keeps unsaved preferences local; only a successful save updates session memory. */
export function useMemoryEditor(memory: Memory, onSaved: MemorySavedHandler) {
  const [draft, setDraft] = useState(memory);
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);

  function update(changes: MemoryDraftChanges) {
    setDraft((previous) => ({ ...previous, ...changes }));
  }

  function reset() {
    setDraft({ ...memory, enabled: true, responseStyle: 'friendly', notes: '' });
  }

  async function save() {
    if (savingRef.current) return;
    savingRef.current = true;
    setIsSaving(true);
    try {
      const saved = await api.saveMemory({
        enabled: draft.enabled,
        responseStyle: draft.responseStyle,
        notes: draft.notes,
        version: memory.version,
      });
      onSaved(saved);
      setDraft(saved);
      toast.success('Memory saved');
    } catch {
      toast.error('Could not save your preferences. Please try again.');
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }

  return { draft, isSaving, update, reset, save };
}
