import { MessageFooter } from '@/components/ui/message/MessageFooter';
import { Copy, ThumbsDown, ThumbsUp } from 'lucide-react';
import { toast } from 'sonner';
import type { MessageActionsProps } from './types';

/** Confirms copying only after clipboard access succeeds. */
async function copyAnswer(content: string) {
  try {
    await navigator.clipboard.writeText(content);
    toast.success('Answer copied');
  } catch {
    toast.error('Could not copy the answer. Select the text to copy it manually.');
  }
}

/** Provides copy and feedback controls for a completed assistant answer. */
export function MessageActions({ message, onFeedback }: MessageActionsProps) {
  return (
    <MessageFooter className="message-actions">
      <button
        type="button"
        aria-label="Copy answer"
        title="Copy answer"
        onClick={() => void copyAnswer(message.content)}
      >
        <Copy size={14} />
      </button>
      <button
        type="button"
        aria-label="Like answer"
        title="Like answer"
        aria-pressed={message.feedback === 'like'}
        data-active={message.feedback === 'like'}
        onClick={() => onFeedback(message.id, message.feedback === 'like' ? null : 'like')}
      >
        <ThumbsUp size={14} />
      </button>
      <button
        type="button"
        aria-label="Dislike answer"
        title="Dislike answer"
        aria-pressed={message.feedback === 'dislike'}
        data-active={message.feedback === 'dislike'}
        onClick={() => onFeedback(message.id, message.feedback === 'dislike' ? null : 'dislike')}
      >
        <ThumbsDown size={14} />
      </button>
    </MessageFooter>
  );
}
