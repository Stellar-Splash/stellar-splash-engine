import { describe, it, expect, beforeEach } from 'vitest';
import {
  PlayerLeaderboardCacheService,
  CachedLeaderboardEntry,
} from '../src/services/player-leaderboard-cache.service';

describe('PlayerLeaderboardCacheService', () => {
  const entries: CachedLeaderboardEntry[] = [
    { rank: 1, playerWallet: 'GBBD...1', score: 1000, updatedAt: 100 },
    { rank: 2, playerWallet: 'GBBD...2', score: 850, updatedAt: 100 },
  ];

  beforeEach(() => {
    PlayerLeaderboardCacheService.clearAll();
  });

  it('sets and retrieves cached leaderboard entries within TTL', () => {
    PlayerLeaderboardCacheService.setLeaderboard('tourney-1', entries, 10_000, 1000);

    const cached = PlayerLeaderboardCacheService.getLeaderboard('tourney-1', 5000);
    expect(cached).toBeDefined();
    expect(cached?.length).toBe(2);
    expect(cached?.[0].playerWallet).toBe('GBBD...1');
  });

  it('expires cached leaderboard when TTL elapses', () => {
    PlayerLeaderboardCacheService.setLeaderboard('tourney-2', entries, 5_000, 1000);

    const expired = PlayerLeaderboardCacheService.getLeaderboard('tourney-2', 7000);
    expect(expired).toBeNull();
  });

  it('invalidates cache on explicit demand', () => {
    PlayerLeaderboardCacheService.setLeaderboard('tourney-3', entries, 10_000, 1000);
    expect(PlayerLeaderboardCacheService.getLeaderboard('tourney-3', 2000)).not.toBeNull();

    const invalidated = PlayerLeaderboardCacheService.invalidate('tourney-3');
    expect(invalidated).toBe(true);
    expect(PlayerLeaderboardCacheService.getLeaderboard('tourney-3', 2000)).toBeNull();
  });

  it('prunes expired entries accurately', () => {
    PlayerLeaderboardCacheService.setLeaderboard('t-exp', entries, 2_000, 1000);
    const pruned = PlayerLeaderboardCacheService.pruneExpired(4000);
    expect(pruned).toBe(1);
  });
});
