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
    expect(verification.rejectionReason).toContain('Sequence numbering must be strictly monotonically increasing');
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
});
