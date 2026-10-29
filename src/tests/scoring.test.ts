import { describe, it, expect } from 'vitest';
import { ScoringService } from '../services/scoring.service';
import { GameEvent, MatchSession } from '../types';

describe('ScoringService', () => {
  it('deterministically calculates score using integer arithmetic', () => {
    const events: GameEvent[] = [
      { seq: 1, timestamp: 1000, type: 'TARGET_HIT', points: 100, combo: 1, multiplier: 1 },
      { seq: 2, timestamp: 1500, type: 'TARGET_HIT', points: 150, combo: 2, multiplier: 2 },
      { seq: 3, timestamp: 2000, type: 'HAZARD_HIT', points: 50, combo: 0, multiplier: 1 },
      { seq: 4, timestamp: 2500, type: 'COMBO_STREAK', points: 30, combo: 0, multiplier: 1 },
      { seq: 5, timestamp: 3000, type: 'MULTIPLIER_UP', points: 0, combo: 0, multiplier: 3 },
    ];

    const breakdown = ScoringService.calculateScore(events);

    // Event 1: TARGET_HIT: points 100, combo 1 (no combo bonus), mult 1 (no mult bonus)
    // Event 2: TARGET_HIT: points 150, combo 2 (+10 combo bonus), mult 2 (+150 mult bonus)
    // Event 3: HAZARD_HIT: penalties 50
    // Event 4: COMBO_STREAK: comboBonus +30
    // Event 5: MULTIPLIER_UP: multiplierBonus +30 (3 * 10)
    // BaseScore = 100 + 150 = 250
    // ComboBonus = 10 + 30 = 40
    // MultiplierBonus = 150 + 30 = 180
    // Penalties = 50
    // Total = 250 + 40 + 180 - 50 = 420
    expect(breakdown.baseScore).toBe(250);
    expect(breakdown.comboBonus).toBe(40);
    expect(breakdown.multiplierBonus).toBe(180);
    expect(breakdown.penalties).toBe(50);
    expect(breakdown.finalScore).toBe(420);
    expect(breakdown.maxCombo).toBe(2);
    // Total target attempts = 2 target hits + 1 hazard = 3 attempts. Target hits = 2. Accuracy = floor(2 * 100 / 3) = 66
    expect(breakdown.accuracy).toBe(66);
  });

  it('guarantees deterministic result hashes for identical match runs', () => {
    const session: MatchSession = {
      matchId: 'match-test-123',
      tournamentId: 'tourn-splash-001',
      playerWallet: 'GCKAZD66N6E64B44J7K3XW6P2W3V7QOXWCV7T4KQL3ZPL2GB6V2A73VU',
      gameId: 'splash-rush',
      gameVersion: '1.0.0',
      sessionToken: 'token-abc',
      startTime: 1000,
      status: 'STARTED',
    };

    const events: GameEvent[] = [
      { seq: 1, timestamp: 1200, type: 'TARGET_HIT', points: 100, combo: 1, multiplier: 1 },
      { seq: 2, timestamp: 1800, type: 'TARGET_HIT', points: 200, combo: 2, multiplier: 1 },
    ];

    const result1 = ScoringService.buildGameResult(session, events, 5000);
    const result2 = ScoringService.buildGameResult(session, events, 5000);

    expect(result1.resultHash).toBe(result2.resultHash);
    expect(result1.resultHash.length).toBe(64); // 256-bit SHA-256 hex string
    expect(result1.finalScore).toBe(310); // 100 + 200 + (2 * 5) = 310
  });

  it('calculates deterministic 10,000 bps prize shares and awards fractional dust to Rank 1', () => {
    const allocations = [
      { rank: 1, basisPoints: 5000 },
      { rank: 2, basisPoints: 3000 },
      { rank: 3, basisPoints: 2000 },
    ];

    // Total: 10,001 Stroops -> Dust = 1 Stroop
    const totalPrize = 10_001n;
    const shares = ScoringService.calculatePrizePoolBpsShares(totalPrize, allocations);

    expect(shares.length).toBe(3);
    expect(shares[0].rank).toBe(1);
    expect(shares[0].shareStroops).toBe(5001n);
    expect(shares[0].isDustRecipient).toBe(true);

    expect(shares[1].rank).toBe(2);
    expect(shares[1].shareStroops).toBe(3000n);
    expect(shares[1].isDustRecipient).toBe(false);

    expect(shares[2].rank).toBe(3);
    expect(shares[2].shareStroops).toBe(2000n);

    // Sum invariant
    const sum = shares.reduce((acc, curr) => acc + curr.shareStroops, 0n);
    expect(sum).toBe(totalPrize);
  });

  it('throws an error when basis points do not sum to 10,000', () => {
    const invalid = [
      { rank: 1, basisPoints: 5000 },
      { rank: 2, basisPoints: 4999 },
    ];
    expect(() => ScoringService.calculatePrizePoolBpsShares(100_000n, invalid)).toThrow(
      'INVALID_BPS_SUM',
    );
  });
});
