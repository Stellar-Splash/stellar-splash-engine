import { describe, it, expect } from 'vitest';
import {
  ReplayBundleValidationService,
  ReplayBundle,
  ReplayTick,
} from '../src/services/replay-bundle-validation.service';

describe('ReplayBundleValidationService', () => {
  const matchId = 'match-101';
  const tournamentId = 'tourney-42';
  const players = ['GBBD...1', 'GBBD...2'];
  const ticks: ReplayTick[] = [
    { tickIndex: 0, playerIndex: 0, action: 'MOVE_UP', timestamp: 100 },
    { tickIndex: 1, playerIndex: 1, action: 'FIRE_WATER_BALLOON', timestamp: 110 },
  ];

  it('validates a correct bundle with computed hash', () => {
    const stateRoot = ReplayBundleValidationService.computeStateRoot(matchId, tournamentId, players, ticks);
    const bundle: ReplayBundle = {
      version: '1.0.0',
      matchId,
      tournamentId,
      players,
      finalScores: { 'GBBD...1': 100, 'GBBD...2': 80 },
      stateRootSha256: stateRoot,
      ticks,
      timestamp: Date.now(),
    };

    const res = ReplayBundleValidationService.validate(bundle, true);
    expect(res.isValid).toBe(true);
    expect(res.bundle).toBeDefined();
    expect(res.error).toBeUndefined();
  });

  it('fails validation on hash mismatch', () => {
    const bundle: ReplayBundle = {
      version: '1.0.0',
      matchId,
      tournamentId,
      players,
      finalScores: { 'GBBD...1': 100 },
      stateRootSha256: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      ticks,
      timestamp: Date.now(),
    };

    const res = ReplayBundleValidationService.validate(bundle, true);
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('State root hash mismatch');
  });

  it('rejects non-sequential tick indexes', () => {
    const invalidTicks: ReplayTick[] = [
      { tickIndex: 0, playerIndex: 0, action: 'MOVE', timestamp: 100 },
      { tickIndex: 5, playerIndex: 0, action: 'MOVE', timestamp: 110 },
    ];

    const bundle = {
      version: '1.0.0',
      matchId,
      tournamentId,
      players,
      finalScores: {},
      stateRootSha256: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      ticks: invalidTicks,
      timestamp: Date.now(),
    };

    const res = ReplayBundleValidationService.validate(bundle, false);
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('Invalid tick index at position 1');
  });

  it('rejects invalid hex hash format', () => {
    const bundle = {
      version: '1.0.0',
      matchId,
      tournamentId,
      players,
      finalScores: {},
      stateRootSha256: 'not-a-valid-hex-hash',
      ticks,
      timestamp: Date.now(),
    };

    const res = ReplayBundleValidationService.validate(bundle, false);
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('64-character hexadecimal SHA-256 hash');
  });
});
