import { describe, it, expect, beforeEach } from 'vitest';
import { PlayerProfileService } from '../src/services/player-profile.service';

describe('PlayerProfileService', () => {
  const wallet = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

  beforeEach(() => {
    PlayerProfileService.reset();
  });

  it('returns empty profile defaults for unknown wallet', () => {
    const profile = PlayerProfileService.getProfile('UNKNOWN');
    expect(profile.matchesPlayed).toBe(0);
    expect(profile.wins).toBe(0);
    expect(profile.winRatePercent).toBe(0);
  });

  it('aggregates match results and computes career stats', () => {
    PlayerProfileService.recordMatchResult(wallet, 't-1', 500, 2, 20, 1000);
    PlayerProfileService.recordMatchResult(wallet, 't-2', 800, 1, 50, 2000);

    const profile = PlayerProfileService.getProfile(wallet);
    expect(profile.matchesPlayed).toBe(2);
    expect(profile.wins).toBe(1);
    expect(profile.winRatePercent).toBe(50);
    expect(profile.totalScore).toBe(1300);
    expect(profile.totalPrizesEarned).toBe(70);
    expect(profile.highestRank).toBe(1);
    expect(profile.firstActiveAt).toBe(1000);
    expect(profile.lastActiveAt).toBe(2000);
  });

  it('returns sorted match history with limit', () => {
    PlayerProfileService.recordMatchResult(wallet, 't-1', 100, 5, 0, 1000);
    PlayerProfileService.recordMatchResult(wallet, 't-2', 200, 3, 10, 2000);
    PlayerProfileService.recordMatchResult(wallet, 't-3', 300, 1, 100, 3000);

    const history = PlayerProfileService.getMatchHistory(wallet, 2);
    expect(history.length).toBe(2);
    expect(history[0].tournamentId).toBe('t-3');
    expect(history[1].tournamentId).toBe('t-2');
  });
});
