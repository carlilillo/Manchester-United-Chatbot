import { Bubble } from '@/components/ui/bubble/Bubble';
import { BubbleContent } from '@/components/ui/bubble/BubbleContent';
import { Message } from '@/components/ui/message/Message';
import { MessageContent } from '@/components/ui/message/MessageContent';
import { MessageFooter } from '@/components/ui/message/MessageFooter';
import { useState } from 'react';
import { UserMessageActions } from './message-actions';
import { MessageTime } from './message-time';
import { UserMessageEditor } from './user-message-editor';
import type { UserMessageProps } from './types';

/**
 * Shows the visitor's question as typed, in a bubble on the right, with its copy and
 * edit actions always visible beneath it.
 */
export function UserMessage({ message, canEdit, onEdit }: UserMessageProps) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing)
    return (
      <Message align="end">
        <MessageContent className="sm:w-[85%]">
          <UserMessageEditor
            initialValue={message.content}
            onCancel={() => setIsEditing(false)}
            onSubmit={(text) => {
              setIsEditing(false);
              onEdit(message.id, text);
            }}
          />
        </MessageContent>
      </Message>
    );

  return (
    <Message align="end">
      <MessageContent className="gap-1.5">
        <span className="sr-only">You said:</span>
        <Bubble variant="secondary" align="end" className="max-w-[85%] sm:max-w-[75%]">
          <BubbleContent className="rounded-2xl rounded-br-md px-4 py-2.5 text-[0.9375rem] leading-relaxed whitespace-pre-wrap">
            {message.content}
          </BubbleContent>
        </Bubble>
        <MessageFooter className="-mr-1.5 gap-2 pl-1">
          <MessageTime value={message.createdAt} />
          <UserMessageActions
            message={message}
            canEdit={canEdit}
            onEdit={() => setIsEditing(true)}
          />
        </MessageFooter>
      </MessageContent>
    </Message>
  );
}
