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
    if (val && val.inFlight && blocking) {
      while (val.inFlight && blocking) {
        await wait(pollFrequencyMs);
      }
      if (!val.error) {
        return val.result;
      }
    } else if (val && val.inFlight && !blocking) {
      // If you're not blocking, then by definition, you can't be dependent upon a return value.
      return;
    }
    cache.set(key, { inFlight: true });
    try {
      const retVal = await fn(...args);
      cache.set(key, { ttl, inFlight: false, result: retVal });
      return retVal;
    } catch (err) {
      cache.set(key, { ttl, inFlight: false, error: err });
    }
  };
};
