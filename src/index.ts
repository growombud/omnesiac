import OmnesiacCache from './OmnesiacCache';

const wait = (ms: number): Promise<void> =>
  new Promise(resolve => {
    setTimeout(() => resolve(), ms);
  });

export interface OmnesiacOptions {
  ttl?: number;
  passThrough?: boolean;
  pollFrequencyMs?: number;
}

export default function Omnesiac(
  fn: Function,
  options: OmnesiacOptions,
): (key: string, ...args: any[]) => Promise<any> {
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
      return val.result;
    }
    return val.result;
  };
}
