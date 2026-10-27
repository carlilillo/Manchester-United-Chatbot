import { describe, expect, it, vi } from 'vitest';
import { createConcurrencyLimiter } from '../src/ingestion/concurrency';

describe('source request concurrency', () => {
  it('never runs more than two requests at once', async () => {
    const limit = createConcurrencyLimiter(2);
    const release: Array<() => void> = [];
    let active = 0;
    let peak = 0;
    const jobs = Array.from({ length: 5 }, (_, index) => limit(async () => {
      active++;
      peak = Math.max(peak, active);
      await new Promise<void>(resolve => { release[index] = resolve; });
      active--;
      return index;
    }));

    await vi.waitFor(() => expect(release.filter(Boolean)).toHaveLength(2));
    expect(peak).toBe(2);
    release[0]();
    await vi.waitFor(() => expect(release.filter(Boolean)).toHaveLength(3));
    release[1]();
    await vi.waitFor(() => expect(release.filter(Boolean)).toHaveLength(4));
    release[2]();
    await vi.waitFor(() => expect(release.filter(Boolean)).toHaveLength(5));
    release[3]();
    release[4]();
    expect(await Promise.all(jobs)).toEqual([0, 1, 2, 3, 4]);
    expect(peak).toBe(2);
  });

  it('releases a slot after a failed request', async () => {
    const limit = createConcurrencyLimiter(1);
    await expect(limit(async () => { throw new Error('429'); })).rejects.toThrow('429');
    await expect(limit(async () => 'next')).resolves.toBe('next');
  });
});
