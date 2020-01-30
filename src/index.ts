//declare function omnesiac<F extends Function>(f: F, options?: memoizee.Options): F & memoizee.Memoized<F>;
interface OmnesiacResult {
  ttl?: number;
  inFlight: boolean;
  result?: any;
}

const wait = (ms: number): Promise<void> =>
  new Promise(resolve => {
    setTimeout(() => resolve(), ms);
  });

class OmnesiacCache {
  private map: Record<string, OmnesiacResult>;
  private timeouts: Record<string, NodeJS.Timeout>;

  constructor() {
    this.map = {};
    this.timeouts = {};
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
    if (result.ttl) {
      this.timeouts[key] = setTimeout(() => this.remove(key), result.ttl);
      if (typeof this.timeouts[key].unref === 'function') this.timeouts[key].unref();
    }
  }

  remove(key: string): void {
    clearTimeout(this.timeouts[key]);
    delete this.timeouts[key];
    delete this.map[key];
  }

  clear(): void {
    this.map = {};
  }
}

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
