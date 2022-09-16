import OmnesiacCache from './OmnesiacCache';
import OmnesiacOptions from './OmnesiacOptions';

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(() => resolve(), ms);
  });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export = function Omnesiac<T extends (...args: any[]) => any>(
  fn: T,
  options: OmnesiacOptions,
): (key: string, ...args: Parameters<T>) => Promise<ReturnType<T> | void> {
  const { ttl = 0, blocking = false, pollFrequencyMs = 10 } = options;
  const cache = new OmnesiacCache<ReturnType<T>>();

  return async function (key: string, ...args: Parameters<T>): Promise<ReturnType<T> | void> {
    const val = cache.get(key);
    if (val?.inFlight && blocking) {
      while (val.inFlight && blocking) {
        await wait(pollFrequencyMs);
      }
    }

    if (!val || val.error) {
      cache.set(key, { inFlight: true, error: false });
      try {
        const retVal = await fn(...args);
        cache.set(key, { ttl, inFlight: false, result: retVal, error: false });
        return retVal;
      } catch (err) {
        cache.set(key, { ttl: 0, inFlight: false, error: err as Error });
        throw err;
      }
    }
    return val.result;
  };
};
