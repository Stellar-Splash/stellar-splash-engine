import { describe, it, expect, beforeEach } from 'vitest';
import { GasPriceCacheService } from '../src/services/gas-price-cache.service';

describe('GasPriceCacheService', () => {
  beforeEach(() => {
    GasPriceCacheService.reset();
  });

  it('populates cache on first call and records a cache miss', () => {
    const now = 1000000;
    const est = GasPriceCacheService.getEstimate('FUND_PRIZE_POOL', 60000, now);

    expect(est.operation).toBe('FUND_PRIZE_POOL');
    expect(est.estimatedFeeStroops).toBeGreaterThan(0);

    const stats = GasPriceCacheService.getStats();
    expect(stats.misses).toBe(1);
    expect(stats.hits).toBe(0);
    expect(stats.entriesCount).toBe(1);
  });

  it('serves subsequent calls from cache within TTL recording cache hits', () => {
    const now = 1000000;
    GasPriceCacheService.getEstimate('PAY_ENTRY_FEE', 60000, now);

    // Call 30 seconds later (within 60s TTL)
    const cachedEst = GasPriceCacheService.getEstimate('PAY_ENTRY_FEE', 60000, now + 30000);
    expect(cachedEst.operation).toBe('PAY_ENTRY_FEE');

    const stats = GasPriceCacheService.getStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
  });

  it('refreshes expired entries past TTL', () => {
    const now = 1000000;
    GasPriceCacheService.getEstimate('EXECUTE_SETTLEMENT', 60000, now);

    // Call 70 seconds later (expired)
    GasPriceCacheService.getEstimate('EXECUTE_SETTLEMENT', 60000, now + 70000);

    const stats = GasPriceCacheService.getStats();
    expect(stats.misses).toBe(2);
    expect(stats.hits).toBe(0);
  });

  it('invalidates cache entries on demand', () => {
    GasPriceCacheService.getEstimate('CREATE_TOURNAMENT');
    expect(GasPriceCacheService.getStats().entriesCount).toBe(1);

    GasPriceCacheService.invalidate('CREATE_TOURNAMENT');
    expect(GasPriceCacheService.getStats().entriesCount).toBe(0);
  });
});
