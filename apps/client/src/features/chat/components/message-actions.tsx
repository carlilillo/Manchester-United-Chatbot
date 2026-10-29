import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip/Tooltip';
import { TooltipContent } from '@/components/ui/tooltip/TooltipContent';
import { TooltipTrigger } from '@/components/ui/tooltip/TooltipTrigger';
import type { Feedback } from '@/features/chat/types';
import { Copy, ThumbsDown, ThumbsUp } from 'lucide-react';
import { toast } from 'sonner';
import type { ActionButtonProps, MessageActionsProps } from './types';

/** Confirms copying only after clipboard access succeeds. */
async function copyAnswer(content: string) {
  try {
    await navigator.clipboard.writeText(content);
    toast.success('Answer copied');
  } catch {
    toast.error('Could not copy the answer. Select the text to copy it manually.');
  }
}

/** Pressing the active rating again clears it. */
function toggleFeedback(current: Feedback | undefined, pressed: NonNullable<Feedback>): Feedback {
  return current === pressed ? null : pressed;
}

/** An icon button whose accessible name is repeated as a tooltip. */
function ActionButton({ label, pressed, onClick, children }: ActionButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            aria-pressed={pressed}
            onClick={onClick}
            className="text-muted-foreground aria-pressed:text-foreground [&[aria-pressed=true]_svg]:fill-current"
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/** Provides copy and feedback controls for a completed assistant answer. */
export function MessageActions({ message, onFeedback }: MessageActionsProps) {
  return (
    <div className="flex items-center">
      <ActionButton label="Copy answer" onClick={() => void copyAnswer(message.content)}>
        <Copy />
      </ActionButton>
      <ActionButton
        label="Like answer"
        pressed={message.feedback === 'like'}
        onClick={() => onFeedback(message.id, toggleFeedback(message.feedback, 'like'))}
      >
        <ThumbsUp />
      </ActionButton>
      <ActionButton
        label="Dislike answer"
        pressed={message.feedback === 'dislike'}
        onClick={() => onFeedback(message.id, toggleFeedback(message.feedback, 'dislike'))}
      >
        <ThumbsDown />
      </ActionButton>
    </div>
  );
}
