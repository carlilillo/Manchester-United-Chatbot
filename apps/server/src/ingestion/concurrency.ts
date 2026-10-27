/** Limit requests to an external service, including work started by future callers. */
export function createConcurrencyLimiter(maxConcurrent: number) {
  if (!Number.isInteger(maxConcurrent) || maxConcurrent < 1) throw new Error('Concurrency must be a positive integer');
  let active = 0;
  const waiting: Array<() => void> = [];

  return async function limited<T>(task: () => Promise<T>): Promise<T> {
    if (active < maxConcurrent) active++;
    else await new Promise<void>(resolve => waiting.push(resolve));

    try { return await task(); }
    finally {
      // Transfer the occupied slot directly to the next caller, preventing a
      // newly arriving request from racing past one that has already waited.
      const next = waiting.shift();
      if (next) next();
      else active--;
    }
  };
}
