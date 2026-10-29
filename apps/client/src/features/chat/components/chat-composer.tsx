import { Alert } from '@/components/ui/alert/Alert';
import { AlertAction } from '@/components/ui/alert/AlertAction';
import { AlertDescription } from '@/components/ui/alert/AlertDescription';
import { Button } from '@/components/ui/button';
import { InputGroup } from '@/components/ui/input-group/InputGroup';
import { InputGroupAddon } from '@/components/ui/input-group/InputGroupAddon';
import { InputGroupButton } from '@/components/ui/input-group/InputGroupButton';
import { InputGroupTextarea } from '@/components/ui/input-group/InputGroupTextarea';
import { ArrowUp, CircleAlert, Square, X } from 'lucide-react';
import type { FormEvent, KeyboardEvent } from 'react';
import { MAX_MESSAGE_LENGTH } from './message-limits';
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
  const canSend = !isSending && !isLoading;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (canSend) onSend();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter used to confirm an IME composition must not submit a partial question.
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      if (canSend) onSend();
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertDescription>{error}</AlertDescription>
          <AlertAction>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onDismissError}
              aria-label="Dismiss error"
            >
              <X />
            </Button>
          </AlertAction>
        </Alert>
      )}
      <form onSubmit={handleSubmit}>
        <InputGroup className="rounded-2xl bg-card shadow-lg shadow-black/40 dark:bg-card has-[[data-slot=input-group-control]:focus-visible]:border-brand/50 has-[[data-slot=input-group-control]:focus-visible]:ring-brand/15">
          <InputGroupTextarea
            value={prompt}
            onChange={(event) => onPromptChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about United…"
            aria-label="Message"
            rows={1}
            maxLength={MAX_MESSAGE_LENGTH}
            disabled={isLoading}
            className="max-h-52 min-h-12 px-4 pt-3.5 text-[0.9375rem] md:text-[0.9375rem]"
          />
          <InputGroupAddon align="block-end" className="justify-end px-2.5 pb-2.5">
            {isSending ? (
              <InputGroupButton
                variant="secondary"
                size="icon-sm"
                className="rounded-full"
                onClick={onStop}
                aria-label="Stop answer"
              >
                <Square className="fill-current" />
              </InputGroupButton>
            ) : (
              // Red only while sending is possible; a disabled send turns neutral.
              <InputGroupButton
                type="submit"
                size="icon-sm"
                className="rounded-full bg-brand text-brand-foreground hover:bg-brand/85 disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100"
                disabled={!prompt.trim() || isLoading}
                aria-label="Send message"
              >
                <ArrowUp />
              </InputGroupButton>
            )}
          </InputGroupAddon>
        </InputGroup>
      </form>
    </div>
  );
}
