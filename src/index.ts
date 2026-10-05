import OmnesiacCache from './OmnesiacCache';
import OmnesiacOptions from './OmnesiacOptions';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export = function Omnesiac<T extends (...args: any[]) => any>(
  fn: T,
  options: OmnesiacOptions,
): (key: string, ...args: Parameters<T>) => Promise<ReturnType<T> | void> {
  const { ttl = 0, blocking = false } = options;
  const cache = new OmnesiacCache<ReturnType<T>>();

  return async function (key: string, ...args: Parameters<T>): Promise<ReturnType<T> | void> {
    const val = cache.get(key);
    if (!val) {
      cache.set(key, { inFlight: true });
      // The executor turns a synchronous throw from fn into a rejection
      const promise = new Promise<ReturnType<T>>((resolve) => resolve(fn(...args))).then(
        (result) => {
          cache.set(key, { ttl, inFlight: false, result });
          return result;
        },
        (error) => {
          // Never cache a failure, so the next call runs fn again
          cache.remove(key);
          throw error;
        },
      );
      cache.set(key, { promise });
      return promise;
    } else if (val.inFlight) {
      // Blocking callers settle with the in-flight call's result or error
      return blocking ? val.promise : undefined;
    }
    return val.result;
  };
};
