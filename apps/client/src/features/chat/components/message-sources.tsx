import { Trace } from '@/components/ui/trace/Trace';
import { TraceCollapsible } from '@/components/ui/trace/TraceCollapsible';
import { TraceCollapsibleContent } from '@/components/ui/trace/TraceCollapsibleContent';
import { TraceCollapsibleTrigger } from '@/components/ui/trace/TraceCollapsibleTrigger';
import { TraceDescription } from '@/components/ui/trace/TraceDescription';
import { TraceIcon } from '@/components/ui/trace/TraceIcon';
import { TraceLine } from '@/components/ui/trace/TraceLine';
import { TraceTitle } from '@/components/ui/trace/TraceTitle';
import { sourceHost } from '@/features/chat/sources';
import { ArrowUpRight, Globe } from 'lucide-react';
import type { MessageSourcesProps } from './types';

/**
 * Lists the pages an answer drew on, following the shadcn Sources pattern: a
 * collapsed Trace whose trigger states the count, opening into one link per page.
 */
export function MessageSources({ sources }: MessageSourcesProps) {
  return (
    <Trace>
      <TraceCollapsible>
        <TraceCollapsibleTrigger>
          <TraceLine>
            <TraceIcon>
              <Globe />
            </TraceIcon>
            <TraceTitle>
              Used {sources.length} {sources.length === 1 ? 'source' : 'sources'}
            </TraceTitle>
          </TraceLine>
        </TraceCollapsibleTrigger>
        <TraceCollapsibleContent>
          <Trace>
            {sources.map((source) => (
              <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">
                <TraceLine>
                  <TraceTitle>{source.title}</TraceTitle>
                  {source.title !== sourceHost(source.url) && (
                    <TraceDescription>{sourceHost(source.url)}</TraceDescription>
                  )}
                  {/* Last, so screen readers hear the title and site before the hint. */}
                  <span className="sr-only"> (opens in a new tab)</span>
                  <TraceIcon>
                    <ArrowUpRight />
                  </TraceIcon>
                </TraceLine>
              </a>
            ))}
          </Trace>
        </TraceCollapsibleContent>
      </TraceCollapsible>
    </Trace>
  );
}
