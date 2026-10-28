import { Trace } from '@/components/ui/trace/Trace';
import { TraceCollapsible } from '@/components/ui/trace/TraceCollapsible';
import { TraceCollapsibleContent } from '@/components/ui/trace/TraceCollapsibleContent';
import { TraceCollapsibleTrigger } from '@/components/ui/trace/TraceCollapsibleTrigger';
import { TraceIcon } from '@/components/ui/trace/TraceIcon';
import { TraceLine } from '@/components/ui/trace/TraceLine';
import { TraceTitle } from '@/components/ui/trace/TraceTitle';
import { BookOpen, MessageCircle, Sparkles } from 'lucide-react';
import type { ActivityTraceProps } from './types';

/** Presents the source and tool activity associated with one assistant answer. */
export function ActivityTrace({ activity }: ActivityTraceProps) {
  if (!activity.length) return null;
  const isRunning = activity.some((item) => item.status === 'running');
  const hasFailed = activity.some((item) => item.status === 'failed');
  return (
    <Trace className="activity-trace">
      <TraceCollapsible>
        <TraceCollapsibleTrigger>
          <TraceLine status={isRunning ? 'running' : undefined}>
            <TraceIcon>
              <Sparkles />
            </TraceIcon>
            <TraceTitle>
              {isRunning
                ? 'Working through sources'
                : hasFailed
                  ? 'Some steps failed'
                  : `${activity.length} ${activity.length === 1 ? 'step' : 'steps'} completed`}
            </TraceTitle>
          </TraceLine>
        </TraceCollapsibleTrigger>
        <TraceCollapsibleContent>
          <Trace>
            {activity.map((item) => (
              <TraceLine
                key={item.id}
                status={
                  item.status === 'running'
                    ? 'running'
                    : item.status === 'failed'
                      ? 'error'
                      : undefined
                }
              >
                <TraceIcon>{item.kind === 'subagent' ? <MessageCircle /> : <BookOpen />}</TraceIcon>
                <TraceTitle>
                  {item.title}
                  {item.detail && <span className="trace-detail">{item.detail}</span>}
                </TraceTitle>
              </TraceLine>
            ))}
          </Trace>
        </TraceCollapsibleContent>
      </TraceCollapsible>
    </Trace>
  );
}
