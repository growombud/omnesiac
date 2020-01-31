import OmnesiacCache from './OmnesiacCache';
import OmnesiacOptions from './OmnesiacOptions';

const wait = (ms: number): Promise<void> =>
  new Promise(resolve => {
    setTimeout(() => resolve(), ms);
  });

export = function Omnesiac(fn: Function, options: OmnesiacOptions): (key: string, ...args: any[]) => Promise<any> {
  const { ttl = 0, passThrough = false, pollFrequencyMs = 10 } = options;
  const cache = new OmnesiacCache();

  return async function(key: string, ...args: any[]): Promise<any> {
    const val = cache.get(key);
    if (!val) {
      cache.set(key, { inFlight: true });
      const retVal = await fn(...args);
      cache.set(key, { ttl, inFlight: false, result: retVal });
      return retVal;
    } else if (val.inFlight) {
      while (val.inFlight && !passThrough) {
        await wait(pollFrequencyMs);
      }
    }
    return val.result;
  };
};
