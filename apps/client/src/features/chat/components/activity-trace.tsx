import { Trace } from '@/components/ui/trace/Trace';
import { TraceCollapsible } from '@/components/ui/trace/TraceCollapsible';
import { TraceCollapsibleContent } from '@/components/ui/trace/TraceCollapsibleContent';
import { TraceCollapsibleTrigger } from '@/components/ui/trace/TraceCollapsibleTrigger';
import { TraceDescription } from '@/components/ui/trace/TraceDescription';
import { TraceIcon } from '@/components/ui/trace/TraceIcon';
import { TraceLine } from '@/components/ui/trace/TraceLine';
import { TraceTitle } from '@/components/ui/trace/TraceTitle';
import { isActivityRunning, summarizeActivity, toTraceStatus } from '@/features/chat/activity';
import type { Activity } from '@united/contracts';
import { CircleCheckIcon, CircleXIcon, LoaderCircleIcon } from 'lucide-react';
import type { ActivityTraceProps } from './types';

/** Marks a step done with a check, matching the shadcn chain-of-thought, while showing progress or failure otherwise. */
function StepIcon({ status }: { status: Activity['status'] }) {
  if (status === 'running') return <LoaderCircleIcon className="animate-spin motion-reduce:animate-none" />;
  if (status === 'failed') return <CircleXIcon />;
  return <CircleCheckIcon />;
}

/** The header reflects the whole chain: running until every step settles, failed if any step failed. */
function overallStatus(activity: Activity[]): Activity['status'] {
  if (isActivityRunning(activity)) return 'running';
  return activity.some((item) => item.status === 'failed') ? 'failed' : 'completed';
}

/** Presents the source and tool activity behind one answer as a collapsible chain of steps. */
export function ActivityTrace({ activity }: ActivityTraceProps) {
  if (!activity.length) return null;

  return (
    <Trace>
      <TraceCollapsible>
        <TraceCollapsibleTrigger>
          <TraceLine status={isActivityRunning(activity) ? 'running' : undefined}>
            <TraceIcon>
              <StepIcon status={overallStatus(activity)} />
            </TraceIcon>
            <TraceTitle>{summarizeActivity(activity)}</TraceTitle>
          </TraceLine>
        </TraceCollapsibleTrigger>
        <TraceCollapsibleContent>
          <Trace>
            {activity.map((item) => (
              <TraceLine key={item.id} status={toTraceStatus(item.status)}>
                <TraceIcon>
                  <StepIcon status={item.status} />
                </TraceIcon>
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
