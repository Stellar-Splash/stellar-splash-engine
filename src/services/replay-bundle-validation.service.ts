import { createHash } from 'crypto';

export interface ReplayTick {
  tickIndex: number;
  playerIndex: number;
  action: string;
  payload?: Record<string, unknown>;
  timestamp: number;
}

export interface ReplayBundle {
  version: string;
  matchId: string;
  tournamentId: string;
  players: string[];
  finalScores: Record<string, number>;
  stateRootSha256: string;
  ticks: ReplayTick[];
  timestamp: number;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  bundle?: ReplayBundle;
}

/**
 * Service for cryptographic verification and structural validation of match replay bundles.
 */
export class ReplayBundleValidationService {
  /**
   * Validates a raw replay bundle object.
   */
  public static validate(raw: unknown, verifyHash: boolean = true): ValidationResult {
    if (!raw || typeof raw !== 'object') {
      return { isValid: false, error: 'Replay bundle must be a non-null object' };
    }

    const b = raw as Partial<ReplayBundle>;

    if (!b.version || typeof b.version !== 'string') {
      return { isValid: false, error: 'Missing or invalid bundle version' };
    }

    if (!b.matchId || typeof b.matchId !== 'string' || b.matchId.trim() === '') {
      return { isValid: false, error: 'Missing or invalid matchId' };
    }

    if (!b.tournamentId || typeof b.tournamentId !== 'string' || b.tournamentId.trim() === '') {
      return { isValid: false, error: 'Missing or invalid tournamentId' };
    }

    if (!Array.isArray(b.players) || b.players.length === 0) {
      return { isValid: false, error: 'Replay bundle must contain at least one player' };
    }

    if (!b.finalScores || typeof b.finalScores !== 'object') {
      return { isValid: false, error: 'Missing finalScores map' };
    }

    if (!b.stateRootSha256 || typeof b.stateRootSha256 !== 'string' || !/^[0-9a-fA-F]{64}$/.test(b.stateRootSha256)) {
      return { isValid: false, error: 'stateRootSha256 must be a 64-character hexadecimal SHA-256 hash' };
    }

    if (!Array.isArray(b.ticks) || b.ticks.length === 0) {
      return { isValid: false, error: 'Replay bundle must contain at least one tick' };
    }

    // Verify sequential tick indices
    for (let i = 0; i < b.ticks.length; i++) {
      const tick = b.ticks[i];
      if (typeof tick.tickIndex !== 'number' || tick.tickIndex !== i) {
        return { isValid: false, error: `Invalid tick index at position ${i}: expected ${i}, got ${tick?.tickIndex}` };
      }
      if (typeof tick.playerIndex !== 'number' || tick.playerIndex < 0 || tick.playerIndex >= b.players.length) {
        return { isValid: false, error: `Invalid playerIndex ${tick?.playerIndex} at tick ${i}` };
      }
    }

    if (verifyHash) {
      const computedHash = this.computeStateRoot(b.matchId, b.tournamentId, b.players, b.ticks);
      if (computedHash.toLowerCase() !== b.stateRootSha256.toLowerCase()) {
        return {
          isValid: false,
          error: `State root hash mismatch: declared ${b.stateRootSha256}, computed ${computedHash}`,
        };
      }
    }

    return {
      isValid: true,
      bundle: b as ReplayBundle,
    };
  }

  /**
   * Deterministically computes the SHA-256 state root of a match's ticks.
   */
  public static computeStateRoot(
    matchId: string,
    tournamentId: string,
    players: string[],
    ticks: ReplayTick[]
  ): string {
    const serialized = JSON.stringify({
      matchId,
      tournamentId,
      players: [...players].sort(),
      ticks: ticks.map((t) => ({
        tickIndex: t.tickIndex,
        playerIndex: t.playerIndex,
        action: t.action,
        payload: t.payload || {},
      })),
    });

    return createHash('sha256').update(serialized).digest('hex');
  }
}
