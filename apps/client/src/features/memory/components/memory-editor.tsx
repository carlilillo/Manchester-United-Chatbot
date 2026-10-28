import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ResponseStyleField } from './response-style-field';
import { useMemoryEditor } from '@/features/memory/hooks/use-memory-editor';
import { Check } from 'lucide-react';
import type { FormEvent } from 'react';
import type { MemoryEditorProps } from './types';

/** Presents editable preferences; persistence and draft updates live in the editor hook. */
export function MemoryEditor({ memory, onSaved }: MemoryEditorProps) {
  const { draft, isSaving, update, reset, save } = useMemoryEditor(memory, onSaved);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void save();
  }

  return (
    <form className="memory-card" onSubmit={handleSubmit}>
      <fieldset disabled={isSaving} className="memory-fields">
        <legend className="sr-only">Response preferences</legend>
        <div className="memory-row">
          <div>
            <h2>Use personal memory</h2>
            <p>Apply your preferences across chats.</p>
          </div>
          <Switch
            checked={draft.enabled}
            onCheckedChange={(enabled) => update({ enabled })}
            aria-label="Use personal memory"
          />
        </div>
        <ResponseStyleField
          value={draft.responseStyle}
          onChange={(responseStyle) => update({ responseStyle })}
        />
        <div className="memory-field">
          <label htmlFor="memory-notes">HOW SHOULD I ANSWER?</label>
          <p id="memory-notes-description">Add anything you want me to keep in mind.</p>
          <Textarea
            id="memory-notes"
            value={draft.notes}
            onChange={(event) => update({ notes: event.target.value })}
            aria-describedby="memory-notes-description memory-notes-count"
            placeholder="For example: Keep answers short and mention official sources."
            maxLength={4000}
            rows={5}
          />
          <small id="memory-notes-count">{draft.notes.length} / 4,000 characters</small>
        </div>
        <div className="memory-footer">
          <Button type="button" variant="ghost" onClick={reset}>
            Reset
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save preferences'}
            <Check data-icon="inline-end" />
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
