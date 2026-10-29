import { GameEvent } from '../types';

export interface DiffOptions {
  maxAllowableDriftMs?: number; // e.g. 100ms tolerance for network frame variance
  allowScoreVariance?: boolean;
}

export interface ReplayDiffResult {
  isIdentical: boolean;
  isCompatible: boolean;
  divergenceIndex: number | null;
  divergenceReason: string | null;
  maxTimestampDriftMs: number;
  meanTimestampDriftMs: number;
  scoreDelta: number;
  eventCountA: number;
  eventCountB: number;
}

export class ReplayDiffService {
  /**
   * Compares two match replay event streams frame-by-frame.
   * Detects non-deterministic simulation drift, missing events, or scoring mismatches.
   */
  public static compareReplays(
    streamA: GameEvent[],
    streamB: GameEvent[],
    options: DiffOptions = {},
  ): ReplayDiffResult {
    const maxAllowableDrift = options.maxAllowableDriftMs ?? 100;
    const allowScoreVariance = options.allowScoreVariance ?? false;

    const eventCountA = streamA.length;
    const eventCountB = streamB.length;

    if (eventCountA === 0 && eventCountB === 0) {
      return {
        isIdentical: true,
        isCompatible: true,
        divergenceIndex: null,
        divergenceReason: null,
        maxTimestampDriftMs: 0,
        meanTimestampDriftMs: 0,
        scoreDelta: 0,
        eventCountA: 0,
        eventCountB: 0,
      };
    }

    if (eventCountA !== eventCountB) {
      return {
        isIdentical: false,
        isCompatible: false,
        divergenceIndex: Math.min(eventCountA, eventCountB),
        divergenceReason: `Event count mismatch: Stream A has ${eventCountA} events, Stream B has ${eventCountB} events`,
        maxTimestampDriftMs: 0,
        meanTimestampDriftMs: 0,
        scoreDelta: 0,
        eventCountA,
        eventCountB,
      };
    }

    let isIdentical = true;
    let isCompatible = true;
    let divergenceIndex: number | null = null;
    let divergenceReason: string | null = null;

    let totalDrift = 0;
    let maxTimestampDriftMs = 0;

    const finalScoreA = streamA[eventCountA - 1]?.points || 0;
    const finalScoreB = streamB[eventCountB - 1]?.points || 0;
    const scoreDelta = Math.abs(finalScoreA - finalScoreB);

    for (let i = 0; i < eventCountA; i++) {
      const a = streamA[i];
      const b = streamB[i];

      // Event type mismatch is fatal
      if (a.type !== b.type) {
        isIdentical = false;
        isCompatible = false;
        divergenceIndex = i;
        divergenceReason = `Event type mismatch at index ${i}: Stream A has '${a.type}', Stream B has '${b.type}'`;
        break;
      }

      // Points mismatch check
      if (!allowScoreVariance && a.points !== b.points) {
        isIdentical = false;
        isCompatible = false;
        divergenceIndex = i;
        divergenceReason = `Score mismatch at index ${i}: Stream A points=${a.points}, Stream B points=${b.points}`;
        break;
      }

      // Timestamp drift calculation
      const drift = Math.abs(a.timestamp - b.timestamp);
      totalDrift += drift;
      if (drift > maxTimestampDriftMs) {
        maxTimestampDriftMs = drift;
      }

      if (drift > 0) {
        isIdentical = false;
      }

      if (drift > maxAllowableDrift) {
        isCompatible = false;
        if (divergenceIndex === null) {
          divergenceIndex = i;
          divergenceReason = `Timestamp drift exceeded ${maxAllowableDrift}ms threshold at index ${i} (drift: ${drift}ms)`;
        }
      }
    }

    const meanTimestampDriftMs =
      eventCountA > 0 ? Math.round((totalDrift / eventCountA) * 100) / 100 : 0;

    return {
      isIdentical,
      isCompatible,
      divergenceIndex,
      divergenceReason,
      maxTimestampDriftMs,
      meanTimestampDriftMs,
      scoreDelta,
      eventCountA,
      eventCountB,
    };
  }
}
