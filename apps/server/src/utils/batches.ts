/** Yield bounded groups without changing their order. */
export function* batches<T>(items: readonly T[], size: number): Generator<T[]> {
  if (!Number.isInteger(size) || size < 1) throw new Error('Batch size must be a positive integer');
  for (let offset = 0; offset < items.length; offset += size) {
    yield items.slice(offset, offset + size);
  }
}
