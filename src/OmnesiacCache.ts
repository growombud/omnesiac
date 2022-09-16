export interface OmnesiacResult<T> {
  ttl?: number;
  inFlight?: boolean;
  result?: T;
  error?: Error | false;
}

export default class OmnesiacCache<T> {
  private map: Record<string, OmnesiacResult<T>>;
  private timeouts: Record<string, NodeJS.Timeout>;

  constructor() {
    this.map = {};
    this.timeouts = {};
  }

  get(key: string): OmnesiacResult<T> {
    return this.map[key];
  }

  set(key: string, result: OmnesiacResult<T>): void {
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
    for (const key in this.map) {
      this.remove(key);
    }
  }
}
