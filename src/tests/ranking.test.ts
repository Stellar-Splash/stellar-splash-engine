import { describe, it, expect } from 'vitest';
import { RankingService } from '../services/ranking.service';
import { ResultVerification, GameResult } from '../types';

describe('Deterministic Tournament Rankings Engine', () => {
  const tournamentId = 'tourn-ranking-test';

  const mockResults: GameResult[] = [
    {
      matchId: 'match-1',
      tournamentId,
      playerWallet: 'GA_PLAYER_1',
      gameVersion: '1.0.0',
      startTime: 1000,
      endTime: 2000,
      durationMs: 1000,
      eventsCount: 10,
      baseScore: 1000,
      comboBonus: 0,
      multiplierBonus: 0,
      penalties: 0,
      finalScore: 1000,
      accuracy: 90,
      maxCombo: 5,
      resultHash: 'hash-1',
      submittedAt: 2050,
      verified: true,
    },
    {
      matchId: 'match-2',
      tournamentId,
      playerWallet: 'GA_PLAYER_2',
      gameVersion: '1.0.0',
      startTime: 1000,
      endTime: 2000,
      durationMs: 1000,
      eventsCount: 10,
      baseScore: 1200,
      comboBonus: 0,
      multiplierBonus: 0,
      penalties: 0,
      finalScore: 1200, // Highest score
      accuracy: 85,
      maxCombo: 6,
      resultHash: 'hash-2',
      submittedAt: 2060,
      verified: true,
    },
    {
      matchId: 'match-3-tied-score',
      tournamentId,
      playerWallet: 'GA_PLAYER_3',
      gameVersion: '1.0.0',
      startTime: 1000,
      endTime: 2000,
      durationMs: 1000,
      eventsCount: 10,
      baseScore: 1000,
      comboBonus: 0,
      multiplierBonus: 0,
      penalties: 0,
      finalScore: 1000, // Tied with Player 1, but higher accuracy
      accuracy: 98, // Higher accuracy => breaks tie
      maxCombo: 8,
      resultHash: 'hash-3',
      submittedAt: 2070,
      verified: true,
    },
    {
      matchId: 'match-4-unverified',
      tournamentId,
      playerWallet: 'GA_PLAYER_4',
      gameVersion: '1.0.0',
      startTime: 1000,
      endTime: 2000,
      durationMs: 1000,
      eventsCount: 10,
      baseScore: 5000, // Highest submitted score, but UNVERIFIED!
      comboBonus: 0,
      multiplierBonus: 0,
      penalties: 0,
      finalScore: 5000,
      accuracy: 99,
      maxCombo: 10,
      resultHash: 'hash-4',
      submittedAt: 2080,
      verified: false,
    },
  ];

  const mockVerifications: ResultVerification[] = [
    {
      verificationId: 'v-1',
      matchId: 'match-1',
      tournamentId,
      playerWallet: 'GA_PLAYER_1',
      gameVersion: '1.0.0',
      submittedScore: 1000,
      replayedScore: 1000,
      scoreMatch: true,
      resultHash: 'hash-1',
      verificationAlgorithm: 'DETERMINISTIC_REPLAY_ENGINE',
      verificationVersion: '1.0.0',
      verifier: 'verifier.stellar-splash.org',
      verifiedAt: 2100,
      status: 'VERIFIED',
    },
    {
      verificationId: 'v-2',
      matchId: 'match-2',
      tournamentId,
      playerWallet: 'GA_PLAYER_2',
      gameVersion: '1.0.0',
      submittedScore: 1200,
      replayedScore: 1200,
      scoreMatch: true,
      resultHash: 'hash-2',
      verificationAlgorithm: 'DETERMINISTIC_REPLAY_ENGINE',
      verificationVersion: '1.0.0',
      verifier: 'verifier.stellar-splash.org',
      verifiedAt: 2105,
      status: 'VERIFIED',
    },
    {
      verificationId: 'v-3',
      matchId: 'match-3-tied-score',
      tournamentId,
      playerWallet: 'GA_PLAYER_3',
      gameVersion: '1.0.0',
      submittedScore: 1000,
      replayedScore: 1000,
      scoreMatch: true,
      resultHash: 'hash-3',
      verificationAlgorithm: 'DETERMINISTIC_REPLAY_ENGINE',
      verificationVersion: '1.0.0',
      verifier: 'verifier.stellar-splash.org',
      verifiedAt: 2110,
      status: 'VERIFIED',
    },
  ];

  it('ranks players deterministically by primary score and secondary accuracy tie-breaker', () => {
    const entries = RankingService.calculateRankings(mockVerifications, mockResults);

    expect(entries.length).toBe(3);

    // Rank 1: Player 2 (Score: 1200)
    expect(entries[0].playerWallet).toBe('GA_PLAYER_2');
    expect(entries[0].rank).toBe(1);
    expect(entries[0].score).toBe(1200);

    // Rank 2: Player 3 (Score: 1000, Accuracy: 98% > Player 1's 90%)
    expect(entries[1].playerWallet).toBe('GA_PLAYER_3');
    expect(entries[1].rank).toBe(2);
    expect(entries[1].accuracy).toBe(98);

    // Rank 3: Player 1 (Score: 1000, Accuracy: 90%)
    expect(entries[2].playerWallet).toBe('GA_PLAYER_1');
    expect(entries[2].rank).toBe(3);
  });

  it('strictly excludes unverified matches from ranking calculations', () => {
    const entries = RankingService.calculateRankings(mockVerifications, mockResults);

    // Player 4 submitted score 5000, but has NO verification record
    const hasUnverified = entries.some((e) => e.playerWallet === 'GA_PLAYER_4');
    expect(hasUnverified).toBe(false);
  });

  it('generates a deterministic 32-byte cryptographic ranking hash', () => {
    const entries = RankingService.calculateRankings(mockVerifications, mockResults);
    const hash1 = RankingService.generateRankingHash(tournamentId, 1, entries);
    const hash2 = RankingService.generateRankingHash(tournamentId, 1, entries);

    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64);
  });
});
