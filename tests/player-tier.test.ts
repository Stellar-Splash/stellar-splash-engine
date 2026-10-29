import { describe, it, expect } from 'vitest';
import { PlayerTierService } from '../src/services/player-tier.service';

describe('PlayerTierService', () => {
  it('evaluates novice player into BRONZE tier', () => {
    const evaluation = PlayerTierService.evaluateTier({
      tournamentsJoined: 1,
      tournamentsWon: 0,
      totalScore: 5000,
    });

    expect(evaluation.tier).toBe('BRONZE');
    expect(evaluation.nextTier).toBe('SILVER');
    expect(evaluation.winRatePct).toBe(0);
    expect(evaluation.tierPoints).toBe(100); // 0 + 50 + 50
  });

  it('evaluates player with wins into SILVER tier', () => {
    const evaluation = PlayerTierService.evaluateTier({
      tournamentsJoined: 3,
      tournamentsWon: 1,
      totalScore: 12000,
    });

    expect(evaluation.tier).toBe('SILVER');
    expect(evaluation.nextTier).toBe('GOLD');
    expect(evaluation.winRatePct).toBe(33.3);
  });

  it('evaluates high-performing player into GOLD tier', () => {
    const evaluation = PlayerTierService.evaluateTier({
      tournamentsJoined: 10,
      tournamentsWon: 2,
      totalScore: 60000,
    });

    expect(evaluation.tier).toBe('GOLD');
    expect(evaluation.nextTier).toBe('PLATINUM');
  });

  it('evaluates elite veteran player into DIAMOND tier', () => {
    const evaluation = PlayerTierService.evaluateTier({
      tournamentsJoined: 20,
      tournamentsWon: 12,
      totalScore: 250000,
    });

    expect(evaluation.tier).toBe('DIAMOND');
    expect(evaluation.nextTier).toBeNull();
    expect(evaluation.progressToNextPct).toBe(100);
    expect(evaluation.winRatePct).toBe(60);
  });
});
