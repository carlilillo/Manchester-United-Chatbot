import { InputGroup } from '@/components/ui/input-group/InputGroup';
import { InputGroupAddon } from '@/components/ui/input-group/InputGroupAddon';
import { InputGroupButton } from '@/components/ui/input-group/InputGroupButton';
import { InputGroupTextarea } from '@/components/ui/input-group/InputGroupTextarea';
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { MAX_MESSAGE_LENGTH } from './message-limits';
import type { UserMessageEditorProps } from './types';

/**
 * Edits a question in place of its bubble. Enter sends, Shift+Enter adds a line and
 * Escape cancels; sending is possible only once the text has changed.
 */
export function UserMessageEditor({ initialValue, onCancel, onSubmit }: UserMessageEditorProps) {
  const [value, setValue] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const text = value.trim();
  const canSubmit = Boolean(text) && text !== initialValue.trim();

  // Focus with the caret after the text, ready to continue typing.
  useEffect(() => {
    const textarea = textareaRef.current;
    textarea?.focus();
    textarea?.setSelectionRange(textarea.value.length, textarea.value.length);
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (canSubmit) onSubmit(text);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
    }
    // Enter used to confirm an IME composition must not submit a partial question.
    else if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      if (canSubmit) onSubmit(text);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <InputGroup className="rounded-2xl bg-secondary dark:bg-secondary has-[[data-slot=input-group-control]:focus-visible]:border-brand/50 has-[[data-slot=input-group-control]:focus-visible]:ring-brand/15">
        <InputGroupTextarea
          ref={textareaRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Edit message"
          maxLength={MAX_MESSAGE_LENGTH}
          className="max-h-72 min-h-12 px-4 pt-3 text-[0.9375rem] leading-relaxed md:text-[0.9375rem]"
        />
        <InputGroupAddon align="block-end" className="justify-end gap-2 px-2.5 pb-2.5">
          <InputGroupButton variant="ghost" size="sm" className="rounded-full" onClick={onCancel}>
            Cancel
          </InputGroupButton>
          <InputGroupButton
            type="submit"
            size="sm"
            className="rounded-full bg-brand px-3.5 text-brand-foreground hover:bg-brand/85 disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100"
            disabled={!canSubmit}
          >
            Send
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
}
