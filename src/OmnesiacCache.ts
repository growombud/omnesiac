export interface OmnesiacResult {
  ttl?: number;
  inFlight: boolean;
  result?: any;
}

export default class OmnesiacCache {
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
