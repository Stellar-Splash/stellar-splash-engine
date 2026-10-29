import { describe, it, expect, beforeEach } from 'vitest';
import { StoreService } from '../src/services/store.service';
import { MatchReplayAuditService } from '../src/services/match-replay-audit.service';
import { MatchSession } from '../src/types';

describe('MatchReplayAuditService', () => {
  beforeEach(() => {
    StoreService.reset();
  });

  it('generates a valid diagnostic audit package for a match', () => {
    const session: MatchSession = {
      matchId: 'match-audit-101',
      tournamentId: 'tourn-aud-1',
      playerWallet: 'GA_AUDIT_PLAYER',
      gameId: 'splash-rush',
      gameVersion: '1.0.0',
      sessionToken: 'token-aud-1',
      startTime: 1000,
      endTime: 2000,
      status: 'COMPLETED',
      events: [
        { seq: 1, timestamp: 1100, type: 'TARGET_HIT', points: 100, combo: 1, multiplier: 1 },
        { seq: 2, timestamp: 1250, type: 'TARGET_HIT', points: 200, combo: 2, multiplier: 1.5 },
      ],
    };

    StoreService.createMatchSession(session);

    const pkg = MatchReplayAuditService.generatePackage('match-audit-101', 5000);

    expect(pkg.matchId).toBe('match-audit-101');
    expect(pkg.tournamentId).toBe('tourn-aud-1');
    expect(pkg.anomalyAnalysis.hasAnomalies).toBe(false);
    expect(pkg.packageChecksum).toMatch(/^[a-f0-9]{64}$/);

    expect(MatchReplayAuditService.verifyPackageChecksum(pkg)).toBe(true);

    // Tampered payload fails checksum
    const tampered = { ...pkg, tournamentId: 'tourn-tampered' };
    expect(MatchReplayAuditService.verifyPackageChecksum(tampered)).toBe(false);
  });
});
