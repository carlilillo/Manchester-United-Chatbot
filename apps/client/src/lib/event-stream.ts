import { streamEventSchema } from '@united/contracts';
import type { StreamEventHandler } from './types';

/** Reads SSE frames across arbitrary network chunks and validates their payloads. */
export async function readEventStream(
  body: ReadableStream<Uint8Array>,
  onEvent: StreamEventHandler,
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let pending = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      pending += decoder.decode(value, { stream: !done });

      // Both LF and CRLF separators may be split between reads.
      let boundary: RegExpExecArray | null;
      while ((boundary = /\r?\n\r?\n/.exec(pending))) {
        const block = pending.slice(0, boundary.index);
        pending = pending.slice(boundary.index + boundary[0].length);
        const data = block
          .split(/\r?\n/)
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).replace(/^ /, ''))
          .join('\n');
        if (data) onEvent(streamEventSchema.parse(JSON.parse(data)));
      }

      if (done) break;
    }
  } finally {
    // A parsing error must not leave the response consuming network resources.
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
