import { describe, it, expect } from 'vitest';
import { ReplayService } from '../src/services/replay.service';
import { PrngService } from '../src/services/prng.service';

describe('Match Seed Derivation & Anti-Precomputation Verification', () => {
  const tournamentId = 'tourn-seed-test-001';
  const matchId = 'match-seed-session-123';
  const playerWallet = 'GA2C5RFPE6GCKMY3US5PAB6UZLKIGAHWKXX2GAKVOOUMVQHGASVMOROB';

  it('generates deterministic 64-character hexadecimal SHA-256 seed', () => {
    const seed1 = ReplayService.deriveCanonicalSeed(tournamentId, matchId, playerWallet);
    const seed2 = ReplayService.deriveCanonicalSeed(tournamentId, matchId, playerWallet);

    expect(seed1).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(seed1)).toBe(true);
    expect(seed1).toBe(seed2);

    // Altering any input must alter the output hash
    const differentWalletSeed = ReplayService.deriveCanonicalSeed(
      tournamentId,
      matchId,
      'GBOXWCV7T4KQL3ZPL2GB6V2A73VUX6KAZD66N6E64B44J7K3XW6P2W3V'
    );
    expect(differentWalletSeed).not.toBe(seed1);
  });

  it('validates matching claimed seed and computes valid 32-bit numeric PRNG seed', () => {
    const canonical = ReplayService.deriveCanonicalSeed(tournamentId, matchId, playerWallet);
    const verification = ReplayService.verifyMatchSeed(
      tournamentId,
      matchId,
      playerWallet,
      canonical
    );

    expect(verification.valid).toBe(true);
    expect(verification.canonicalSeed).toBe(canonical);
    expect(typeof verification.numericSeed).toBe('number');
    expect(verification.numericSeed).toBe(PrngService.hashStringToSeed(canonical));
    expect(verification.error).toBeUndefined();
  });

  it('rejects tampered or mismatched claimed seed with descriptive error', () => {
    const fraudulentSeed = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const verification = ReplayService.verifyMatchSeed(
      tournamentId,
      matchId,
      playerWallet,
      fraudulentSeed
    );

    expect(verification.valid).toBe(false);
    expect(verification.error).toContain('SEED_MISMATCH');
    expect(verification.canonicalSeed).not.toBe(fraudulentSeed);
  });
});
