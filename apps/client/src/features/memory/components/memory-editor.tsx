import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field/Field';
import { FieldContent } from '@/components/ui/field/FieldContent';
import { FieldDescription } from '@/components/ui/field/FieldDescription';
import { FieldGroup } from '@/components/ui/field/FieldGroup';
import { FieldLabel } from '@/components/ui/field/FieldLabel';
import { FieldLegend } from '@/components/ui/field/FieldLegend';
import { FieldSet } from '@/components/ui/field/FieldSet';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useMemoryEditor } from '@/features/memory/hooks/use-memory-editor';
import { MAX_NOTES_LENGTH } from '@/features/memory/preferences';
import type { FormEvent } from 'react';
import { ResponseStyleField } from './response-style-field';
import type { MemoryEditorProps } from './types';

/** Padding shared by each row of the preferences panel. */
const ROW = 'p-5 sm:px-6';

/** Presents editable preferences; persistence and draft updates live in the editor hook. */
export function MemoryEditor({ memory, onSaved }: MemoryEditorProps) {
  const { draft, isSaving, update, reset, save } = useMemoryEditor(memory, onSaved);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void save();
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Disabling the fieldset locks every control while a save is in flight. */}
      <FieldSet disabled={isSaving} className="min-w-0 gap-6">
        <FieldLegend className="sr-only">Response preferences</FieldLegend>
        <FieldGroup className="gap-0 divide-y rounded-xl border bg-card/40">
          <Field orientation="horizontal" className={ROW}>
            <FieldContent>
              <FieldLabel htmlFor="memory-enabled">Use memory</FieldLabel>
              <FieldDescription id="memory-enabled-description">
                When off, answers ignore your tone and notes.
              </FieldDescription>
            </FieldContent>
            <Switch
              id="memory-enabled"
              checked={draft.enabled}
              onCheckedChange={(enabled) => update({ enabled })}
              aria-label="Use memory"
              aria-describedby="memory-enabled-description"
            />
          </Field>
          <ResponseStyleField
            value={draft.responseStyle}
            onChange={(responseStyle) => update({ responseStyle })}
            className={ROW}
          />
          <Field className={ROW}>
            <FieldLabel htmlFor="memory-notes">How should I answer?</FieldLabel>
            <Textarea
              id="memory-notes"
              value={draft.notes}
              onChange={(event) => update({ notes: event.target.value })}
              aria-describedby="memory-notes-count"
              placeholder="For example: keep answers short and mention official sources."
              maxLength={MAX_NOTES_LENGTH}
              rows={4}
              className="min-h-28 resize-y"
            />
            <FieldDescription id="memory-notes-count" className="text-right text-xs tabular-nums">
              {draft.notes.length.toLocaleString()} / {MAX_NOTES_LENGTH.toLocaleString()} characters
            </FieldDescription>
          </Field>
        </FieldGroup>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="lg" onClick={reset}>
            Restore defaults
          </Button>
          <Button type="submit" size="lg">
            {isSaving ? 'Saving…' : 'Save memory'}
          </Button>
        </div>
      </FieldSet>
    </form>
  );
}
