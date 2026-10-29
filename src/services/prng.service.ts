/**
 * Seeded Deterministic Pseudorandom Number Generator (PRNG) Service
 *
 * Implements Mulberry32 PRNG algorithm for deterministic match target generation
 * and server-side target trajectory verification. Guarantees that client and server
 * match simulations produce identical target positions and timing given the same seed.
 */

export interface GeneratedTarget {
  id: number;
  spawnTimeMs: number;
  expireTimeMs: number;
  x: number;
  y: number;
  radius: number;
  type: 'STANDARD' | 'BURST' | 'GOLDEN' | 'HAZARD';
  points: number;
}

export class PrngService {
  /**
   * Hashes an arbitrary string into a deterministic 32-bit integer seed using FNV-1a.
   */
  public static hashStringToSeed(input: string): number {
    let hash = 2166136261;
    for (let i = 0; i < input.length; i++) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  /**
   * Returns a 32-bit Mulberry32 PRNG generator yielding floats in [0, 1).
   */
  public static createMulberry32(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
      state = (state + 0x6d2b79f5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * Generates a deterministic sequence of game targets for a given match.
   */
  public static generateTargetSequence(
    matchSeed: string,
    durationMs: number = 45000,
    spawnIntervalMs: number = 750,
    canvasWidth: number = 790,
    canvasHeight: number = 460,
  ): GeneratedTarget[] {
    const seed = this.hashStringToSeed(matchSeed);
    const prng = this.createMulberry32(seed);

    const targets: GeneratedTarget[] = [];
    let currentTime = 1000; // First spawn at 1s
    let targetId = 1;

    while (currentTime < durationMs - 1500) {
      const typeRoll = prng();
      let type: 'STANDARD' | 'BURST' | 'GOLDEN' | 'HAZARD' = 'STANDARD';
      let points = 10;
      let radius = 28;
      let lifeMs = 2800;

      if (typeRoll < 0.15) {
        type = 'HAZARD';
        points = -50;
        radius = 24;
        lifeMs = 3200;
      } else if (typeRoll < 0.3) {
        type = 'BURST';
        points = 25;
        radius = 22;
        lifeMs = 2200;
      } else if (typeRoll < 0.4) {
        type = 'GOLDEN';
        points = 50;
        radius = 32;
        lifeMs = 1800;
      }

      // Safe margins away from canvas borders
      const margin = 50;
      const x = Math.round(margin + prng() * (canvasWidth - margin * 2));
      const y = Math.round(margin + prng() * (canvasHeight - margin * 2));

      targets.push({
        id: targetId++,
        spawnTimeMs: currentTime,
        expireTimeMs: currentTime + lifeMs,
        x,
        y,
        radius,
        type,
        points,
      });

      // Variable interval based on PRNG
      const intervalJitter = (prng() - 0.5) * 200;
      currentTime += Math.round(Math.max(400, spawnIntervalMs + intervalJitter));
    }

    return targets;
  }

  /**
   * Validates if a target hit event matches any deterministically generated target.
   */
  public static validateHitAgainstTargetSequence(
    targets: GeneratedTarget[],
    clickX: number,
    clickY: number,
    elapsedMs: number,
    tolerancePx: number = 10,
  ): { valid: boolean; target?: GeneratedTarget } {
    for (const t of targets) {
      if (elapsedMs >= t.spawnTimeMs && elapsedMs <= t.expireTimeMs + 100) {
        const dist = Math.hypot(clickX - t.x, clickY - t.y);
        if (dist <= t.radius + tolerancePx) {
          return { valid: true, target: t };
        }
      }
    }
    return { valid: false };
  }
}
