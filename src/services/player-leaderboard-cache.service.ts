export interface CachedLeaderboardEntry {
  rank: number;
  playerWallet: string;
  score: number;
  updatedAt: number;
}

interface CacheItem {
  rankings: CachedLeaderboardEntry[];
  expiresAt: number;
}

/**
 * High-performance TTL cache service for tournament leaderboard rankings.
 */
export class PlayerLeaderboardCacheService {
  private static readonly DEFAULT_TTL_MS = 15_000; // 15 seconds
  private static cache: Map<string, CacheItem> = new Map();

  /**
   * Resets entire cache store (used in unit testing).
   */
  public static clearAll(): void {
    this.cache.clear();
  }

  /**
   * Stores leaderboard rankings in cache with a TTL.
   */
  public static setLeaderboard(
    tournamentId: string,
    rankings: CachedLeaderboardEntry[],
    ttlMs: number = this.DEFAULT_TTL_MS,
    currentTime: number = Date.now()
  ): void {
    this.cache.set(tournamentId, {
      rankings: [...rankings],
      expiresAt: currentTime + ttlMs,
    });
  }

  /**
   * Retrieves cached rankings if unexpired.
   */
  public static getLeaderboard(
    tournamentId: string,
    currentTime: number = Date.now()
  ): CachedLeaderboardEntry[] | null {
    const item = this.cache.get(tournamentId);
    if (!item) return null;

    if (currentTime > item.expiresAt) {
      this.cache.delete(tournamentId);
      return null;
    }

    return [...item.rankings];
  }

  /**
   * Invalidates cached rankings for a specific tournament.
   */
  public static invalidate(tournamentId: string): boolean {
    return this.cache.delete(tournamentId);
  }

  /**
   * Prunes all expired cache items.
   */
  public static pruneExpired(currentTime: number = Date.now()): number {
    let pruned = 0;
    for (const [id, item] of this.cache.entries()) {
      if (currentTime > item.expiresAt) {
        this.cache.delete(id);
        pruned++;
      }
    }
    return pruned;
  }
}
