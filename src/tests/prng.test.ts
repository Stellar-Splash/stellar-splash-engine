import { describe, it, expect } from 'vitest';
import { PrngService } from '../services/prng.service';

describe('PrngService - Deterministic Seeded Target Generation', () => {
  it('computes deterministic 32-bit integer seeds from string match identifiers', () => {
    const seed1 = PrngService.hashStringToSeed('tourn-101:match-999:player-A');
    const seed2 = PrngService.hashStringToSeed('tourn-101:match-999:player-A');
    const seedDifferent = PrngService.hashStringToSeed('tourn-101:match-999:player-B');

    expect(seed1).toBeGreaterThan(0);
    expect(seed1).toEqual(seed2);
    expect(seed1).not.toEqual(seedDifferent);
  });

  it('generates identical pseudorandom float sequences given identical seeds', () => {
    const prngA = PrngService.createMulberry32(123456789);
    const prngB = PrngService.createMulberry32(123456789);

    const seqA = [prngA(), prngA(), prngA(), prngA(), prngA()];
    const seqB = [prngB(), prngB(), prngB(), prngB(), prngB()];

    expect(seqA).toEqual(seqB);
  });

  it('generates deterministic target sequence bounded by canvas geometry and match duration', () => {
    const matchSeed = 'testnet-splash-match-uuid-55';
    const targets = PrngService.generateTargetSequence(matchSeed, 45000, 750, 790, 460);

    expect(targets.length).toBeGreaterThan(20);

    for (const t of targets) {
      expect(t.x).toBeGreaterThanOrEqual(50);
      expect(t.x).toBeLessThanOrEqual(740);
      expect(t.y).toBeGreaterThanOrEqual(50);
      expect(t.y).toBeLessThanOrEqual(410);
      expect(t.spawnTimeMs).toBeGreaterThan(0);
      expect(t.expireTimeMs).toBeGreaterThan(t.spawnTimeMs);
      expect(['STANDARD', 'BURST', 'GOLDEN', 'HAZARD']).toContain(t.type);
    }

    // Verify reproducibility
    const duplicateTargets = PrngService.generateTargetSequence(matchSeed, 45000, 750, 790, 460);
    expect(duplicateTargets).toEqual(targets);
  });

  it('validates hit coordinates and timestamps against active target sequence', () => {
    const matchSeed = 'verifiable-hit-match-seed';
    const targets = PrngService.generateTargetSequence(matchSeed, 30000);
    const firstTarget = targets[0];

    // Valid hit centered on first target within its lifespan
    const hitResult = PrngService.validateHitAgainstTargetSequence(
      targets,
      firstTarget.x,
      firstTarget.y,
      firstTarget.spawnTimeMs + 500
    );
    expect(hitResult.valid).toBe(true);
    expect(hitResult.target?.id).toEqual(firstTarget.id);

    // Hit after target expiration
    const expiredHit = PrngService.validateHitAgainstTargetSequence(
      targets,
      firstTarget.x,
      firstTarget.y,
      firstTarget.expireTimeMs + 500
    );
    expect(expiredHit.valid).toBe(false);

    // Hit far outside target coordinates
    const missedHit = PrngService.validateHitAgainstTargetSequence(
      targets,
      firstTarget.x + 150,
      firstTarget.y + 150,
      firstTarget.spawnTimeMs + 500
    );
    expect(missedHit.valid).toBe(false);
  });
});
