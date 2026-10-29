import { MessageScroller } from '@/components/ui/message-scroller/MessageScroller';
import { MessageScrollerButton } from '@/components/ui/message-scroller/MessageScrollerButton';
import { MessageScrollerContent } from '@/components/ui/message-scroller/MessageScrollerContent';
import { MessageScrollerItem } from '@/components/ui/message-scroller/MessageScrollerItem';
import { MessageScrollerProvider } from '@/components/ui/message-scroller/MessageScrollerProvider';
import { MessageScrollerViewport } from '@/components/ui/message-scroller/MessageScrollerViewport';
import { cn } from 'cn';
import { AssistantMessage } from './assistant-message';
import { chatColumnClassName } from './chat-column';
import { UserMessage } from './user-message';
import type { TranscriptProps } from './types';

/** Delegates streaming follow and message anchoring to the shared scroller. */
export function Transcript({ messages, canEdit, onFeedback, onEdit }: TranscriptProps) {
  return (
    <MessageScrollerProvider autoScroll>
      {/* The viewport spans the full width so its scrollbar sits at the page edge. */}
      <MessageScroller className="min-h-0 flex-1" aria-label="Conversation">
        <MessageScrollerViewport>
          <MessageScrollerContent className={cn(chatColumnClassName, 'gap-8 pt-8 pb-10')}>
            {messages.map((message) => (
              <MessageScrollerItem
                key={message.id}
                messageId={message.id}
                scrollAnchor={message.role === 'human'}
              >
                {message.role === 'human' ? (
                  <UserMessage message={message} canEdit={canEdit} onEdit={onEdit} />
                ) : (
                  <AssistantMessage message={message} onFeedback={onFeedback} />
                )}
              </MessageScrollerItem>
            ))}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton />
      </MessageScroller>
    </MessageScrollerProvider>
  );
}
