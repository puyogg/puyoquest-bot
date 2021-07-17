export class CacheMap<T> {
  private map: Map<string, T>;
  private time: Map<string, Date>;
  private threshold: number;

  /**
   * @param threshold The time in milliseconds until the cache becomes invalid.
   */
  constructor(threshold: number) {
    this.map = new Map();
    this.time = new Map();
    this.threshold = threshold;
  }

  public get(key: string): { item: T | undefined; useCache: boolean } {
    const time = this.time.get(key);
    const now = new Date();
    const useCache = !!time && time > new Date(now.getTime() - this.threshold);

    return {
      item: this.map.get(key),
      useCache,
    };
  }

  public set(key: string, value: T): void {
    this.map.set(key, value);
    this.time.set(key, new Date());
  }
}
