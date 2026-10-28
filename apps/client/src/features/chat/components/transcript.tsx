import { MessageScroller } from '@/components/ui/message-scroller/MessageScroller';
import { MessageScrollerButton } from '@/components/ui/message-scroller/MessageScrollerButton';
import { MessageScrollerContent } from '@/components/ui/message-scroller/MessageScrollerContent';
import { MessageScrollerItem } from '@/components/ui/message-scroller/MessageScrollerItem';
import { MessageScrollerProvider } from '@/components/ui/message-scroller/MessageScrollerProvider';
import { MessageScrollerViewport } from '@/components/ui/message-scroller/MessageScrollerViewport';
import { TranscriptMessage } from './transcript-message';
import type { TranscriptProps } from './types';

/** Delegates streaming follow and message anchoring to the shared scroller. */
export function Transcript({ messages, onFeedback }: TranscriptProps) {
  return (
    <MessageScrollerProvider autoScroll>
      <MessageScroller className="transcript" aria-label="Conversation">
        <MessageScrollerViewport>
          <MessageScrollerContent className="transcript-content">
            {messages.map((message) => (
              <MessageScrollerItem
                key={message.id}
                messageId={message.id}
                scrollAnchor={message.role === 'human'}
              >
                <TranscriptMessage message={message} onFeedback={onFeedback} />
              </MessageScrollerItem>
            ))}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton />
      </MessageScroller>
    </MessageScrollerProvider>
  );
}
