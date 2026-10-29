import { Bubble } from '@/components/ui/bubble/Bubble';
import { BubbleContent } from '@/components/ui/bubble/BubbleContent';
import { Message } from '@/components/ui/message/Message';
import { MessageContent } from '@/components/ui/message/MessageContent';
import { MessageFooter } from '@/components/ui/message/MessageFooter';
import { MessageMarkdown } from '@/features/chat/components/message-markdown/MessageMarkdown';
import { collectSources } from '@/features/chat/sources';
import { APP_NAME } from '@/lib/site';
import { useMemo } from 'react';
import { ActivityTrace } from './activity-trace';
import { MessageActions } from './message-actions';
import { MessageSources } from './message-sources';
import { MessageTime } from './message-time';
import type { AssistantMessageProps } from './types';

/**
 * Lays an answer across the full reading column, without an avatar: position
 * and the absence of a bubble identify the assistant. Activity sits above the
 * text and the sources it cited follow it; actions appear once the answer is complete.
 */
export function AssistantMessage({ message, onFeedback }: AssistantMessageProps) {
  const isStreaming = message.status === 'streaming';
  // Sources wait for the stream to end, so the list does not grow line by line.
  const sources = useMemo(
    () => (isStreaming ? [] : collectSources(message)),
    [isStreaming, message],
  );

  return (
    <Message align="start">
      <MessageContent className="gap-3">
        <span className="sr-only">{APP_NAME} said:</span>
        <ActivityTrace activity={message.activity ?? []} />
        {(message.content || isStreaming) && (
          <Bubble variant="ghost" className="w-full">
            <BubbleContent className="w-full overflow-visible">
              {message.content ? (
                <MessageMarkdown content={message.content} />
              ) : (
                <span className="text-[0.9375rem] text-muted-foreground shimmer motion-reduce:shimmer-none">
                  Composing an answer…
                </span>
              )}
            </BubbleContent>
          </Bubble>
        )}
        {sources.length > 0 && <MessageSources sources={sources} />}
        {message.status === 'failed' && (
          <p className="text-sm text-destructive">The answer stopped because of an error.</p>
        )}
        {message.status === 'cancelled' && (
          <p className="text-sm text-muted-foreground">Stopped.</p>
        )}
        {message.status === 'complete' && (
          <MessageFooter className="-ml-1.5 gap-2">
            <MessageActions message={message} onFeedback={onFeedback} />
            <MessageTime value={message.createdAt} />
          </MessageFooter>
        )}
      </MessageContent>
    </Message>
  );
}
