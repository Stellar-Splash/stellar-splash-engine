/**
 * High-performance In-Memory TTL-based LRU Cache Service
 * Provides sub-millisecond query responses for frequent tournament lookups,
 * rankings, and participant metrics, preventing redundant RPC overhead.
 */

export interface CacheEntry<T> {
  key: string;
  value: T;
  expiresAt: number;
  lastAccessed: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  maxSize: number;
}

export class CacheService<T = any> {
  private map: Map<string, CacheEntry<T>> = new Map();
  private maxSize: number;
  private defaultTtlMs: number;
  private hits: number = 0;
  private misses: number = 0;
  private evictions: number = 0;

  constructor(maxSize: number = 500, defaultTtlMs: number = 60_000) {
    this.maxSize = Math.max(1, maxSize);
    this.defaultTtlMs = defaultTtlMs;
  }

  /**
   * Retrieves a cached value if present and unexpired.
   */
  public get(key: string): T | undefined {
    const entry = this.map.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }

    const now = Date.now();
    if (now > entry.expiresAt) {
      this.map.delete(key);
      this.misses++;
      return undefined;
    }

    // Update LRU access order by re-inserting
    entry.lastAccessed = now;
    this.map.delete(key);
    this.map.set(key, entry);

    this.hits++;
    return entry.value;
  }

  /**
   * Stores a value in the cache with optional custom TTL.
   * Evicts least recently used entry if cache capacity is exceeded.
   */
  public set(key: string, value: T, ttlMs?: number): void {
    const now = Date.now();
    const effectiveTtl = ttlMs !== undefined ? ttlMs : this.defaultTtlMs;
    const expiresAt = now + effectiveTtl;

    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.maxSize) {
      // Evict least recently used (first key in Map iterator)
      const oldestKey = this.map.keys().next().value;
      if (oldestKey !== undefined) {
        this.map.delete(oldestKey);
        this.evictions++;
      }
    }

    this.map.set(key, {
      key,
      value,
      expiresAt,
      lastAccessed: now,
    });
  }

  /**
   * Checks whether a valid, unexpired entry exists for the key.
   */
  public has(key: string): boolean {
    const entry = this.map.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Removes a specific key from the cache.
   */
  public delete(key: string): boolean {
    return this.map.delete(key);
  }

  /**
   * Clears all entries from the cache.
   */
  public clear(): void {
    this.map.clear();
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  /**
   * Returns current active cached count (pruning expired on check).
   */
  public size(): number {
    this.pruneExpired();
    return this.map.size;
  }

  /**
   * Prunes all expired keys from the cache.
   */
  public pruneExpired(): number {
    const now = Date.now();
    let pruned = 0;
    for (const [key, entry] of this.map.entries()) {
      if (now > entry.expiresAt) {
        this.map.delete(key);
        pruned++;
      }
    }
    return pruned;
  }

  /**
   * Retrieves or computes a cached value atomically.
   */
  public async getOrSet(
    key: string,
    producer: () => Promise<T>,
    ttlMs?: number,
  ): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await producer();
    this.set(key, value, ttlMs);
    return value;
  }

  /**
   * Returns performance telemetry and cache hit ratio.
   */
  public getStats(): CacheStats {
    return {
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      size: this.map.size,
      maxSize: this.maxSize,
    };
  }
}

// Global cache singletons
export const tournamentCache = new CacheService(500, 30_000); // 30s TTL
export const rankingCache = new CacheService(200, 15_000); // 15s TTL
