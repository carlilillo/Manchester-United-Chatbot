import { Trace } from '@/components/ui/trace/Trace';
import { TraceCollapsible } from '@/components/ui/trace/TraceCollapsible';
import { TraceCollapsibleContent } from '@/components/ui/trace/TraceCollapsibleContent';
import { TraceCollapsibleTrigger } from '@/components/ui/trace/TraceCollapsibleTrigger';
import { TraceDescription } from '@/components/ui/trace/TraceDescription';
import { TraceIcon } from '@/components/ui/trace/TraceIcon';
import { TraceLine } from '@/components/ui/trace/TraceLine';
import { TraceTitle } from '@/components/ui/trace/TraceTitle';
import { isActivityRunning, summarizeActivity, toTraceStatus } from '@/features/chat/activity';
import { BookOpen, MessageCircle, Sparkles } from 'lucide-react';
import type { ActivityTraceProps } from './types';

/** Presents the source and tool activity behind one answer as a collapsible chain of steps. */
export function ActivityTrace({ activity }: ActivityTraceProps) {
  if (!activity.length) return null;

  return (
    <Trace>
      <TraceCollapsible>
        <TraceCollapsibleTrigger>
          <TraceLine status={isActivityRunning(activity) ? 'running' : undefined}>
            <TraceIcon>
              <Sparkles />
            </TraceIcon>
            <TraceTitle>{summarizeActivity(activity)}</TraceTitle>
          </TraceLine>
        </TraceCollapsibleTrigger>
        <TraceCollapsibleContent>
          <Trace>
            {activity.map((item) => (
              <TraceLine key={item.id} status={toTraceStatus(item.status)}>
                <TraceIcon>{item.kind === 'subagent' ? <MessageCircle /> : <BookOpen />}</TraceIcon>
                <TraceTitle>{item.title}</TraceTitle>
                {item.detail && (
                  <TraceDescription className="min-w-0 shrink truncate">
                    {item.detail}
                  </TraceDescription>
                )}
              </TraceLine>
            ))}
          </Trace>
        </TraceCollapsibleContent>
      </TraceCollapsible>
    </Trace>
  );
}
