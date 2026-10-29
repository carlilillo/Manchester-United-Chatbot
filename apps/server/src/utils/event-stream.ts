import type { Response } from 'express';
import type { StreamEvent } from '@united/contracts';

export interface RunStream {
  readonly signal: AbortSignal;
  emit(event: StreamEvent): void;
}

/** Keep Express framing and disconnect handling outside the agent execution service. */
export function createEventStream(response: Response) {
  const abort = new AbortController();
  const onClose = () => abort.abort();
  response.on('close', onClose);

  return {
    signal: abort.signal,
    emit(event: StreamEvent): void {
      if (response.destroyed || response.writableEnded) return;
      // Delay commitment until chats.begin succeeds, allowing normal 404/409 responses.
      if (!response.headersSent) response.flushHeaders();
      response.write(`data: ${JSON.stringify(event)}\n\n`);
    },
    close(): void {
      response.off('close', onClose);
      if (!response.writableEnded) response.end();
    },
    dispose(): void {
      response.off('close', onClose);
    },
  };
}
