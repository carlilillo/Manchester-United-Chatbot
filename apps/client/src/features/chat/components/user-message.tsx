import { Bubble } from '@/components/ui/bubble/Bubble';
import { BubbleContent } from '@/components/ui/bubble/BubbleContent';
import { Message } from '@/components/ui/message/Message';
import { MessageContent } from '@/components/ui/message/MessageContent';
import { MessageFooter } from '@/components/ui/message/MessageFooter';
import { MessageTime } from './message-time';
import type { UserMessageProps } from './types';

/** Shows the visitor's question as typed, in a bubble on the right. */
export function UserMessage({ message }: UserMessageProps) {
  return (
    <Message align="end">
      <MessageContent className="gap-1.5">
        <span className="sr-only">You said:</span>
        <Bubble variant="secondary" align="end" className="max-w-[85%] sm:max-w-[75%]">
          <BubbleContent className="rounded-2xl rounded-br-md px-4 py-2.5 text-[0.9375rem] leading-relaxed whitespace-pre-wrap">
            {message.content}
          </BubbleContent>
        </Bubble>
        <MessageFooter className="px-1">
          <MessageTime value={message.createdAt} />
        </MessageFooter>
      </MessageContent>
    </Message>
  );
}
