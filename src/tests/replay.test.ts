import { describe, it, expect } from 'vitest';
import { ReplayService } from '../services/replay.service';
import { AttestationService } from '../services/attestation.service';
import { CanonicalService } from '../services/canonical.service';
import { MatchSession, GameResult, GameEvent } from '../types';

describe('Deterministic Replay & Verification Engine', () => {
  const session: MatchSession = {
    matchId: 'match-replay-001',
    tournamentId: 'tourn-splash-001',
    playerWallet: 'GCKAZD66N6E64B44J7K3XW6P2W3V7QOXWCV7T4KQL3ZPL2GB6V2A73VU',
    gameId: 'splash-rush',
    gameVersion: '1.0.0',
    sessionToken: 'session-tok-123',
    startTime: 1000000,
    endTime: 1045000,
    status: 'COMPLETED',
  };

  const validEvents: GameEvent[] = [
    { seq: 1, timestamp: 1005000, type: 'TARGET_HIT', points: 100, combo: 1, multiplier: 1 },
    { seq: 2, timestamp: 1010000, type: 'TARGET_HIT', points: 150, combo: 2, multiplier: 2 },
    { seq: 3, timestamp: 1015000, type: 'COMBO_STREAK', points: 50, combo: 3, multiplier: 2 },
    { seq: 4, timestamp: 1020000, type: 'HAZARD_HIT', points: 50, combo: 0, multiplier: 1 },
  ];

  // Calculation:
  // Base: 100 + 150 = 250
  // ComboBonus: Event 2 (combo 2 => +10) + Event 3 (streak => +50) = 60
  // MultiplierBonus: Event 2 (mult 2 => +150) = 150
  // Penalties: Event 4 => 50
  // Expected = 250 + 60 + 150 - 50 = 410

  const validResult: GameResult = {
    matchId: session.matchId,
    tournamentId: session.tournamentId,
    playerWallet: session.playerWallet,
    gameVersion: '1.0.0',
    startTime: session.startTime,
    endTime: session.endTime!,
    durationMs: 45000,
    eventsCount: validEvents.length,
    baseScore: 250,
    comboBonus: 60,
    multiplierBonus: 150,
    penalties: 50,
    finalScore: 410,
    accuracy: 66,
    maxCombo: 3,
    resultHash: '',
    submittedAt: 1046000,
    verified: false,
  };

  it('successfully verifies legitimate client score through independent replay', () => {
    const verification = ReplayService.verifyMatch(session, validResult, validEvents);

    expect(verification.status).toBe('VERIFIED');
    expect(verification.scoreMatch).toBe(true);
    expect(verification.replayedScore).toBe(410);
    expect(verification.submittedScore).toBe(410);
    expect(verification.resultHash).toBeDefined();
    expect(verification.resultHash.length).toBe(64);
  });

  it('rejects tampered or forged client scores (untrusted input principle)', () => {
    const tamperedResult = { ...validResult, finalScore: 9999 }; // Client lied about score
    const verification = ReplayService.verifyMatch(session, tamperedResult, validEvents);

    expect(verification.status).toBe('VERIFICATION_FAILED');
    expect(verification.scoreMatch).toBe(false);
    expect(verification.replayedScore).toBe(410);
    expect(verification.submittedScore).toBe(9999);
    expect(verification.rejectionReason).toContain('Score mismatch');
  });

  it('rejects non-monotonic or disordered event sequences', () => {
    const corruptedEvents: GameEvent[] = [
      { seq: 2, timestamp: 1010000, type: 'TARGET_HIT', points: 150, combo: 2, multiplier: 2 },
      { seq: 1, timestamp: 1005000, type: 'TARGET_HIT', points: 100, combo: 1, multiplier: 1 },
    ];

    const verification = ReplayService.verifyMatch(session, validResult, corruptedEvents);

    expect(verification.status).toBe('REJECTED');
    expect(verification.rejectionReason).toContain(
      'Sequence numbering must be strictly monotonically increasing',
    );
  });

  it('rejects events with backwards timestamps', () => {
    const backwardsEvents: GameEvent[] = [
      { seq: 1, timestamp: 1010000, type: 'TARGET_HIT', points: 100, combo: 1, multiplier: 1 },
      { seq: 2, timestamp: 1005000, type: 'TARGET_HIT', points: 150, combo: 2, multiplier: 2 },
    ];

    const verification = ReplayService.verifyMatch(session, validResult, backwardsEvents);

    expect(verification.status).toBe('REJECTED');
    expect(verification.rejectionReason).toContain('Non-monotonic event timestamp');
  });

  it('rejects games played on mismatched or unsupported versions', () => {
    const staleSession = { ...session, gameVersion: '0.9.0-alpha' };
    const verification = ReplayService.verifyMatch(staleSession, validResult, validEvents);

    expect(verification.status).toBe('REJECTED');
    expect(verification.rejectionReason).toContain('Unsupported or mismatched game version');
  });

  it('creates verifiable cryptographic attestations bound to the canonical result', () => {
    const verification = ReplayService.verifyMatch(session, validResult, validEvents);
    const attestation = AttestationService.createAttestation(verification);

    expect(attestation.resultHash).toBe(verification.resultHash);
    expect(attestation.finalScore).toBe(410);
    expect(attestation.attestationDigest).toBeDefined();

    const isValid = AttestationService.verifyAttestation(attestation, verification);
    expect(isValid).toBe(true);
  });

  it('ensures canonical serialization produces deterministic hashes regardless of object key order', () => {
    const objA = { z: 1, a: 'test', m: { b: 2, a: 1 } };
    const objB = { a: 'test', m: { a: 1, b: 2 }, z: 1 };

    const normA = CanonicalService.canonicalSerialize(objA);
    const normB = CanonicalService.canonicalSerialize(objB);

    expect(normA).toBe(normB);
    expect(CanonicalService.sha256Hex(normA)).toBe(CanonicalService.sha256Hex(normB));
  });

  it('detects and rejects inhuman click velocity (autoclicker / macro bots)', () => {
    const macroEvents: GameEvent[] = [
      { seq: 1, timestamp: 1005000, type: 'TARGET_HIT', points: 100, combo: 1, multiplier: 1 },
      // 10ms interval = 100 clicks/sec -> bot signature!
      { seq: 2, timestamp: 1005010, type: 'TARGET_HIT', points: 100, combo: 2, multiplier: 1 },
    ];

    const verification = ReplayService.verifyMatch(
      session,
      { ...validResult, finalScore: 200 },
      macroEvents,
    );
    expect(verification.status).toBe('REJECTED');
    expect(verification.rejectionReason).toContain('INHUMAN_CLICK_VELOCITY');
  });

  it('detects and rejects out-of-bounds target hit coordinates', () => {
    const outOfBoundsEvents: GameEvent[] = [
      {
        seq: 1,
        timestamp: 1005000,
        type: 'TARGET_HIT',
        points: 100,
        combo: 1,
        multiplier: 1,
        data: {
          clickX: 100,
          clickY: 100,
          targetX: 500, // 400px away!
          targetY: 500,
          targetRadius: 40,
        },
      },
    ];

    const verification = ReplayService.verifyMatch(
      session,
      { ...validResult, finalScore: 100 },
      outOfBoundsEvents,
    );
    expect(verification.status).toBe('REJECTED');
    expect(verification.rejectionReason).toContain('GEOMETRIC_OUT_OF_BOUNDS');
  });

  it('records structured anti-cheat fraud detection logs when violations occur', () => {
    const invalidVersionSession: MatchSession = {
      ...session,
      matchId: 'match-fraud-test',
      gameVersion: '0.0.1-hacked',
    };

    ReplayService.verifyMatch(invalidVersionSession, validResult, validEvents);

    const fraudLogs = ReplayService.getFraudAuditLogs({ tournamentId: session.tournamentId });
    expect(fraudLogs.length).toBeGreaterThan(0);
    const lastFraud = fraudLogs[fraudLogs.length - 1];
    expect(lastFraud.eventType).toBe('ANTI_CHEAT_FRAUD_FLAG');
    expect((lastFraud.details as any).reasonCode).toBe('UNSUPPORTED_GAME_VERSION');
  });

  it('rejects truncated or speed-hacked matches deviating by > 2000ms from 45s round duration', () => {
    // 20s match instead of 45s
    const truncatedResult = {
      ...validResult,
      endTime: session.startTime + 20000,
      durationMs: 20000,
    };

    const verification = ReplayService.verifyMatch(session, truncatedResult, validEvents);
    expect(verification.status).toBe('REJECTED');
    expect(verification.rejectionReason).toContain('INVALID_MATCH_DURATION');
  });

  it('rejects extended or frozen timer matches exceeding duration tolerance', () => {
    // 60s match instead of 45s
    const extendedResult = {
      ...validResult,
      endTime: session.startTime + 60000,
      durationMs: 60000,
    };

    const verification = ReplayService.verifyMatch(session, extendedResult, validEvents);
    expect(verification.status).toBe('REJECTED');
    expect(verification.rejectionReason).toContain('INVALID_MATCH_DURATION');
  });

  it('accepts legitimate match duration within +/- 2000ms tolerance', () => {
    // 45.8s match (network delay)
    const tolerantResult = {
      ...validResult,
      endTime: session.startTime + 45800,
      durationMs: 45800,
    };

    const verification = ReplayService.verifyMatch(session, tolerantResult, validEvents);
    expect(verification.status).toBe('VERIFIED');
  });
});
