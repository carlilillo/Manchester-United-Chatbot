import { formatMessageTime } from '@/features/chat/format';
import type { MessageTimeProps } from './types';

/** Shows when a message was sent, quietly, beside its footer actions. */
export function MessageTime({ value }: MessageTimeProps) {
  return (
    <time dateTime={value} className="text-xs text-muted-foreground/70 tabular-nums">
      {formatMessageTime(value)}
    </time>
  );
}
