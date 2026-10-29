import type { ChatMessage, StreamEvent } from '@united/contracts';
import type { InterruptedMessageStatus } from './types';

/**
 * Builds the optimistic question shown before the server confirms it. The
 * request id doubles as the message id so the persisted copy can replace it.
 */
export function createHumanMessage(
  text: string,
  requestId: string,
  createdAt: string,
): ChatMessage {
  return { id: requestId, role: 'human', content: text, createdAt, status: 'complete', requestId };
}

/**
 * Shows an edited question in place of the original and drops everything after it,
 * mirroring the server, which keeps the question's id and discards later messages.
 */
export function replaceHumanMessage(
  messages: ChatMessage[],
  messageId: string,
  text: string,
  requestId: string,
  createdAt: string,
): ChatMessage[] {
  const index = messages.findIndex((message) => message.id === messageId);
  if (index < 0) return messages;
  return [...messages.slice(0, index), { ...messages[index], content: text, createdAt, requestId }];
}

/** Applies a validated server event without mutating the current transcript. */
export function applyStreamEvent(
  messages: ChatMessage[],
  event: StreamEvent,
  createdAt: string,
): ChatMessage[] {
  if (event.type === 'started') {
    return [
      ...messages,
      {
        id: event.messageId,
        role: 'ai',
        content: '',
        createdAt,
        status: 'streaming',
        activity: [],
        feedback: null,
      },
    ];
  }

  return messages.map((message) => {
    const messageId = event.type === 'completed' ? event.message.id : event.messageId;
    if (message.id !== messageId) return message;

    switch (event.type) {
      case 'delta':
        return { ...message, content: message.content + event.text };
      case 'activity':
        return {
          ...message,
          activity: [
            ...(message.activity ?? []).filter((item) => item.id !== event.activity.id),
            event.activity,
          ],
        };
      case 'completed':
        return event.message;
      case 'error':
        // Provider diagnostics belong on the server, never in the transcript.
        return { ...message, status: 'failed' };
    }
  });
}

/** Ends unfinished answers when the connection fails or the visitor stops it. */
export function finishStreamingMessages(
  messages: ChatMessage[],
  status: InterruptedMessageStatus,
): ChatMessage[] {
  return messages.map((message) =>
    message.status === 'streaming' ? { ...message, status } : message,
  );
}
