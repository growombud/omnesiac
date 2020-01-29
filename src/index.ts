//declare function omnesiac<F extends Function>(f: F, options?: memoizee.Options): F & memoizee.Memoized<F>;
interface OmnesiacResult {
  expiry?: number;
  inFlight: boolean;
  result?: any;
}

const wait = (ms: number): Promise<void> =>
  new Promise(resolve => {
    setTimeout(() => resolve(), ms);
  });

class OmnesiacCache {
  private map: Record<string, OmnesiacResult>;
  private evictionFrequencyMs: number;

  constructor(evictionFrequencyMs = 50) {
    this.map = {};
    this.evictionFrequencyMs = evictionFrequencyMs;
  }

  get(key: string): OmnesiacResult {
    return this.map[key];
  }

  set(key: string, result: OmnesiacResult): void {
    const val = this.get(key);
    if (!val) {
      this.map[key] = result;
    } else {
      Object.assign(val, result);
    }
  }

  remove(key: string): void {
    delete this.map[key];
  }

  clear(): void {
    this.map = {};
  }

  async start(ttl: number): Promise<void> {
    if (ttl) {
      while (true) {
        await wait(this.evictionFrequencyMs);
        for (const key in this.map) {
          const val = this.get(key);
          if (!val.inFlight && val.expiry && val.expiry < Date.now()) {
            this.remove(key);
          }
        }
      }
    }
  }
}

export interface OmnesiacOptions {
  ttl?: number;
  passThrough?: boolean;
  pollFrequencyMs?: number;
  evictionFrequencyMs?: number;
}

export default function Omnesiac(
  fn: Function,
  options: OmnesiacOptions,
): (key: string, ...args: any[]) => Promise<any> {
  const { ttl = 0, passThrough = false, pollFrequencyMs = 10, evictionFrequencyMs = 50 } = options;
  const cache = new OmnesiacCache(evictionFrequencyMs);
  cache.start(ttl);

  return async function(key: string, ...args: any[]): Promise<any> {
    const val = cache.get(key);
    if (!val) {
      cache.set(key, { inFlight: true });
      const retVal = await fn(...args);
      cache.set(key, { expiry: Date.now() + ttl, inFlight: false, result: retVal });
      return retVal;
    } else if (val.expiry && val.expiry > Date.now()) {
      return val.result;
    } else if (val.inFlight) {
      while (val.inFlight && !passThrough) {
        await wait(pollFrequencyMs);
      }
      return val.result;
    }
  };
}
