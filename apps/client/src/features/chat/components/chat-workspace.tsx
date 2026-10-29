import { LoadingScreen } from '@/components/layout/loading-screen';
import { ChatComposer } from './chat-composer';
import { chatColumnClassName } from './chat-column';
import { ChatDisclaimer } from './chat-disclaimer';
import { Transcript } from './transcript';
import { Welcome } from './welcome';
import type { ChatWorkspaceProps } from './types';

/**
 * Composes the active conversation and its composer. The composer keeps the
 * same position in the tree in every state, so it never remounts and keeps
 * focus when the first question turns the welcome screen into a transcript.
 */
export function ChatWorkspace({ conversation }: ChatWorkspaceProps) {
  const isEmpty = !conversation.isLoading && !conversation.messages.length;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {conversation.isLoading ? (
        <LoadingScreen />
      ) : isEmpty ? (
        <Welcome />
      ) : (
        <Transcript
          messages={conversation.messages}
          // Editing starts a new run, so it waits for the current answer to finish.
          canEdit={!conversation.isSending && Boolean(conversation.threadId)}
          onFeedback={conversation.feedback}
          onEdit={(messageId, text) => void conversation.edit(messageId, text)}
        />
      )}
      <div className={chatColumnClassName}>
        <ChatComposer
          prompt={conversation.prompt}
          error={conversation.error}
          isSending={conversation.isSending}
          isLoading={conversation.isLoading}
          onPromptChange={conversation.setPrompt}
          onSend={conversation.send}
          onStop={conversation.stop}
          onDismissError={conversation.dismissError}
        />
      </div>
      <ChatDisclaimer className={isEmpty ? 'mt-auto' : undefined} />
    </div>
  );
}
