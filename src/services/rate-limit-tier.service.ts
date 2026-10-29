export type RateLimitTier = 'ANONYMOUS' | 'PLAYER' | 'CREATOR' | 'INTERNAL_ADMIN';

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAfterMs: number;
  tier: RateLimitTier;
}

/**
 * Service providing tiered sliding-window rate limiting for Engine API endpoints.
 */
export class RateLimitTierService {
  public static readonly TIER_LIMITS: Record<RateLimitTier, RateLimitConfig> = {
    ANONYMOUS: { maxRequests: 30, windowMs: 60_000 },
    PLAYER: { maxRequests: 120, windowMs: 60_000 },
    CREATOR: { maxRequests: 300, windowMs: 60_000 },
    INTERNAL_ADMIN: { maxRequests: 1200, windowMs: 60_000 },
  };

  private static requestLogs: Map<string, number[]> = new Map();

  /**
   * Clears all request tracking logs (used in unit testing).
   */
  public static resetAll(): void {
    this.requestLogs.clear();
  }

  /**
   * Resets request tracking for a specific identifier.
   */
  public static resetIdentifier(identifier: string): void {
    this.requestLogs.delete(identifier);
  }

  /**
   * Evaluates rate limit status for an identifier without recording a new hit.
   */
  public static checkLimit(
    identifier: string,
    tier: RateLimitTier = 'ANONYMOUS',
    now: number = Date.now()
  ): RateLimitDecision {
    const config = this.TIER_LIMITS[tier];
    const timestamps = this.requestLogs.get(identifier) || [];
    const windowStart = now - config.windowMs;

    const validTimestamps = timestamps.filter((t) => t > windowStart);
    const count = validTimestamps.length;
    const allowed = count < config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - count);

    const oldestTimestamp = validTimestamps[0] ?? now;
    const resetAfterMs = validTimestamps.length > 0 ? Math.max(0, oldestTimestamp + config.windowMs - now) : 0;

    return {
      allowed,
      remaining,
      limit: config.maxRequests,
      resetAfterMs,
      tier,
    };
  }

  /**
   * Records a request hit and returns the decision.
   */
  public static recordRequest(
    identifier: string,
    tier: RateLimitTier = 'ANONYMOUS',
    now: number = Date.now()
  ): RateLimitDecision {
    const decision = this.checkLimit(identifier, tier, now);
    if (!decision.allowed) {
      return decision;
    }

    const config = this.TIER_LIMITS[tier];
    const windowStart = now - config.windowMs;
    const timestamps = (this.requestLogs.get(identifier) || []).filter((t) => t > windowStart);
    timestamps.push(now);
    this.requestLogs.set(identifier, timestamps);

    return {
      allowed: true,
      remaining: Math.max(0, config.maxRequests - timestamps.length),
      limit: config.maxRequests,
      resetAfterMs: Math.max(0, timestamps[0] + config.windowMs - now),
      tier,
    };
  }

  /**
   * Prunes all request logs older than the maximum window (60s).
   */
  public static pruneOldWindows(now: number = Date.now()): number {
    let prunedCount = 0;
    const maxWindow = 60_000;

    for (const [identifier, timestamps] of this.requestLogs.entries()) {
      const valid = timestamps.filter((t) => t > now - maxWindow);
      if (valid.length === 0) {
        this.requestLogs.delete(identifier);
        prunedCount++;
      } else {
        this.requestLogs.set(identifier, valid);
      }
    }

    return prunedCount;
  }
}
