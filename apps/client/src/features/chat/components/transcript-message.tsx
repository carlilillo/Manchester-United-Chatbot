import { Bubble } from '@/components/ui/bubble/Bubble';
import { BubbleContent } from '@/components/ui/bubble/BubbleContent';
import { Message } from '@/components/ui/message/Message';
import { MessageAvatar } from '@/components/ui/message/MessageAvatar';
import { MessageContent } from '@/components/ui/message/MessageContent';
import { MessageHeader } from '@/components/ui/message/MessageHeader';
import { ActivityTrace } from './activity-trace';
import { MessageActions } from './message-actions';
import { MessageMarkdown } from '@/features/chat/components/message-markdown/MessageMarkdown';
import { Sparkles } from 'lucide-react';
import type { TranscriptMessageProps } from './types';

/** Arranges the author, answer, activity, and actions for a single message. */
export function TranscriptMessage({ message, onFeedback }: TranscriptMessageProps) {
  const human = message.role === 'human';
  return (
    <Message align={human ? 'end' : 'start'} className="conversation-message">
      {!human && (
        <MessageAvatar className="assistant-avatar">
          <Sparkles size={15} />
        </MessageAvatar>
      )}
      <MessageContent>
        <MessageHeader>
          {human ? 'You' : 'United Archive'}{' '}
          <time className="message-time" dateTime={message.createdAt}>
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </time>
        </MessageHeader>
        {!human && <ActivityTrace activity={message.activity ?? []} />}
        {(message.content || message.status === 'streaming') && (
          <Bubble
            variant={human ? 'default' : 'ghost'}
            align={human ? 'end' : 'start'}
            className={human ? 'user-bubble' : 'assistant-bubble'}
          >
            <BubbleContent className="message-markdown">
              {message.content ? (
                <MessageMarkdown content={message.content} />
              ) : (
                <span className="waiting-text">Composing an answer…</span>
              )}
            </BubbleContent>
          </Bubble>
        )}
        {message.status === 'failed' && (
          <p className="message-status">The answer stopped because of an error.</p>
        )}
        {message.status === 'cancelled' && <p className="message-status">Stopped.</p>}
        {!human && message.status === 'complete' && (
          <MessageActions message={message} onFeedback={onFeedback} />
        )}
      </MessageContent>
    </Message>
  );
}
