import { MessageScroller as MessageScrollerPrimitive } from '@shadcn/react/message-scroller';
import type { MessageScrollerProviderProps } from './types';

/** Shares scroll anchoring and streaming-follow state with the transcript. */
export function MessageScrollerProvider(props: MessageScrollerProviderProps) {
  return <MessageScrollerPrimitive.Provider {...props} />;
}
