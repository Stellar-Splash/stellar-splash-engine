import { describe, it, expect, vi } from 'vitest';
import { CacheService } from '../src/services/cache.service';

describe('CacheService - TTL-based LRU Cache', () => {
  it('stores and retrieves cached items with hit/miss statistics', () => {
    const cache = new CacheService<string>(10, 1000);

    expect(cache.get('k1')).toBeUndefined();
    expect(cache.getStats().misses).toBe(1);

    cache.set('k1', 'val1');
    expect(cache.get('k1')).toBe('val1');
    expect(cache.getStats().hits).toBe(1);
    expect(cache.has('k1')).toBe(true);
  });

  it('evicts least recently used items when exceeding capacity', () => {
    const cache = new CacheService<number>(3, 10_000);

    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);

    // Access 'a' to make 'b' the least recently used
    expect(cache.get('a')).toBe(1);

    // Insert 'd', which exceeds max size of 3 and should evict 'b'
    cache.set('d', 4);

    expect(cache.get('b')).toBeUndefined(); // evicted
    expect(cache.get('a')).toBe(1);
    expect(cache.get('c')).toBe(3);
    expect(cache.get('d')).toBe(4);
    expect(cache.getStats().evictions).toBe(1);
  });

  it('expires entries after TTL elapsed', async () => {
    const cache = new CacheService<string>(10, 50); // 50ms TTL

    cache.set('quick', 'expire-me');
    expect(cache.get('quick')).toBe('expire-me');

    // Wait 60ms
    await new Promise((resolve) => setTimeout(resolve, 60));

    expect(cache.has('quick')).toBe(false);
    expect(cache.get('quick')).toBeUndefined();
  });

  it('computes value with getOrSet only on cache miss', async () => {
    const cache = new CacheService<number>(10, 5000);
    const producer = vi.fn().mockResolvedValue(42);

    const res1 = await cache.getOrSet('computed', producer);
    expect(res1).toBe(42);
    expect(producer).toHaveBeenCalledTimes(1);

    // Second call should return cached without calling producer
    const res2 = await cache.getOrSet('computed', producer);
    expect(res2).toBe(42);
    expect(producer).toHaveBeenCalledTimes(1);
  });
});
