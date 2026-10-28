import { InputGroup } from '@/components/ui/input-group/InputGroup';
import { InputGroupAddon } from '@/components/ui/input-group/InputGroupAddon';
import { InputGroupButton } from '@/components/ui/input-group/InputGroupButton';
import { InputGroupTextarea } from '@/components/ui/input-group/InputGroupTextarea';
import { ArrowUp, CircleStop, ShieldCheck, X } from 'lucide-react';
import type { FormEvent, KeyboardEvent } from 'react';
import type { ChatComposerProps } from './types';

/** Collects a question and supports Enter, Shift+Enter, and stopping an answer. */
export function ChatComposer({
  prompt,
  error,
  isSending,
  isLoading,
  onPromptChange,
  onSend,
  onStop,
  onDismissError,
}: ChatComposerProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isSending && !isLoading) onSend();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter used to confirm an IME composition must not submit a partial question.
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      if (!isSending && !isLoading) onSend();
    }
  }

  return (
    <div className="composer-wrap">
      {error && (
        <div role="alert" className="chat-error">
          <X size={15} />
          {error}
          <button type="button" onClick={onDismissError} aria-label="Dismiss error">
            ×
          </button>
        </div>
      )}
      <form className="composer" onSubmit={handleSubmit}>
        <InputGroup>
          <InputGroupTextarea
            value={prompt}
            onChange={(event) => onPromptChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about United…"
            aria-label="Message"
            rows={2}
            maxLength={8000}
            disabled={isLoading}
          />
          <InputGroupAddon align="block-end">
            <div className="composer-hint">
              <ShieldCheck size={14} /> GROUNDED IN THE ARCHIVE
            </div>
            {isSending ? (
              <InputGroupButton type="button" onClick={onStop} aria-label="Stop answer">
                <CircleStop />
              </InputGroupButton>
            ) : (
              <InputGroupButton
                type="submit"
                disabled={!prompt.trim() || isLoading}
                aria-label="Send message"
              >
                <ArrowUp />
              </InputGroupButton>
            )}
          </InputGroupAddon>
        </InputGroup>
      </form>
      <p className="composer-disclaimer">
        United Archive is an independent fan project. Check official sources for the latest
        information.
      </p>
    </div>
  );
}
