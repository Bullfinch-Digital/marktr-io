/**
 * Ensures only one async operation runs per key at a time.
 * Concurrent callers receive the same in-flight promise.
 */
const inFlight = new Map<string, Promise<unknown>>();

export function runOncePerKey<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inFlight.get(key);
  if (existing) return existing as Promise<T>;

  const promise = Promise.resolve()
    .then(fn)
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, promise);
  return promise;
}
