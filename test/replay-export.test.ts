import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { StoreService } from '../src/services/store.service';
import { MatchSession, GameResult } from '../src/types';

describe('Match Replay Snapshot Exporter & Audit Verification', () => {
  const validWallet = 'GA2C5RFPE6GCKMY3US5PAB6UZLKIGAHWKXX2GAKVOOUMVQHGASVMOROB';
  const app = createApp();

  beforeEach(() => {
    StoreService.reset();
  });

  it('returns HTTP 404 for non-existent match replay export', async () => {
    const res = await request(app).get('/api/games/matches/non-existent-match-id/export');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('exports full match replay with cryptographic archive digest and audit headers', async () => {
    const matchId = 'match-audit-export-101';
    const tournamentId = 'tourn-export-101';
    const now = Date.now();

    const mockSession: MatchSession = {
      matchId,
      sessionToken: 'token-export-101',
      tournamentId,
      playerWallet: validWallet,
      gameId: 'splash-rush',
      gameVersion: '1.0.0',
      startTime: now - 30000,
      endTime: now,
      status: 'COMPLETED',
      events: [
        {
          seq: 1,
          timestamp: now - 28000,
          type: 'TARGET_HIT',
          points: 100,
          combo: 1,
          multiplier: 1,
        },
        {
          seq: 2,
          timestamp: now - 25000,
          type: 'TARGET_HIT',
          points: 100,
          combo: 2,
          multiplier: 1,
        },
      ],
    };

    const mockResult: GameResult = {
      matchId,
      tournamentId,
      playerWallet: validWallet,
      gameId: 'splash-rush',
      gameVersion: '1.0.0',
      startTime: now - 30000,
      endTime: now,
      durationMs: 30000,
      baseScore: 200,
      comboBonus: 0,
      hazardPenalties: 0,
      finalScore: 200,
      maxCombo: 2,
      accuracy: 100,
      targetHits: 2,
      hazardHits: 0,
      misses: 0,
      eventsCount: 2,
      resultHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      verified: true,
      createdAt: now,
    };

    StoreService.createMatchSession(mockSession);
    StoreService.saveGameResult(mockResult);

    const res = await request(app).get(`/api/games/matches/${matchId}/export`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.matchId).toBe(matchId);
    expect(res.body.tournamentId).toBe(tournamentId);
    expect(res.body.playerWallet).toBe(validWallet);
    expect(res.body.eventsCount).toBe(2);
    expect(res.body.result.finalScore).toBe(200);

    // Cryptographic archive digest validation
    expect(res.body.archiveDigest).toBeDefined();
    expect(res.body.archiveDigest).toHaveLength(64);

    // Verify response audit headers
    expect(res.headers['x-audit-match-id']).toBe(matchId);
    expect(res.headers['x-audit-result-hash']).toBe(mockResult.resultHash);
    expect(res.headers['x-audit-archive-digest']).toBe(res.body.archiveDigest);
    expect(res.headers['x-audit-exported-at']).toBeDefined();
  });
});
