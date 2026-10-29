import { GasPriceEstimatorService, SorobanOperationType, GasEstimate } from './gas-price-estimator.service';

export interface CachedGasPrice {
  estimate: GasEstimate;
  cachedAt: number;
  expiresAt: number;
}

export interface GasCacheStats {
  hits: number;
  misses: number;
  entriesCount: number;
}

/**
 * Service providing high-speed TTL caching for Soroban gas fee estimates,
 * preventing redundant RPC requests under high transaction volume.
 */
export class GasPriceCacheService {
  private static readonly DEFAULT_TTL_MS = 60 * 1000; // 60 seconds
  private static cache: Map<string, CachedGasPrice> = new Map();
  private static hits = 0;
  private static misses = 0;

  /**
   * Resets internal cache state (used in unit testing).
   */
  public static reset(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Retrieves a cached gas estimate or computes and stores a fresh estimate.
   */
  public static getEstimate(
    operation: SorobanOperationType,
    ttlMs: number = this.DEFAULT_TTL_MS,
    now: number = Date.now()
  ): GasEstimate {
    const cached = this.cache.get(operation);
    if (cached && now < cached.expiresAt) {
      this.hits++;
      return cached.estimate;
    }

    this.misses++;
    const freshEstimate = GasPriceEstimatorService.estimateFee(operation);

    this.cache.set(operation, {
      estimate: freshEstimate,
      cachedAt: now,
      expiresAt: now + ttlMs,
    });

    return freshEstimate;
  }

  /**
   * Invalidates cached estimates (e.g. upon surge pricing alerts).
   */
  public static invalidate(operation?: SorobanOperationType): void {
    if (operation) {
      this.cache.delete(operation);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Returns cache utilization statistics.
   */
  public static getStats(): GasCacheStats {
    return {
      hits: this.hits,
      misses: this.misses,
      entriesCount: this.cache.size,
    };
  }
}
