import { LoadingScreen } from '@/components/layout/loading-screen';
import { ChatComposer } from './chat-composer';
import { Transcript } from './transcript';
import { Welcome } from './welcome';
import type { ChatWorkspaceProps } from './types';

/** Composes the active conversation view and its question composer. */
export function ChatWorkspace({ conversation }: ChatWorkspaceProps) {
  return (
    <div className="chat-layout">
      {conversation.isLoading ? (
        <LoadingScreen />
      ) : conversation.messages.length ? (
        <Transcript messages={conversation.messages} onFeedback={conversation.feedback} />
      ) : (
        <Welcome onSuggestion={conversation.send} disabled={conversation.isSending} />
      )}
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
  );
}
