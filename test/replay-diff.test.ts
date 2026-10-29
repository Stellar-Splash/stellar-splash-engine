import { describe, it, expect } from 'vitest';
import { ReplayDiffService } from '../src/services/replay-diff.service';
import { GameEvent } from '../src/types';

describe('ReplayDiffService - Match Replay Diff & Determinism Analysis', () => {
  const baseStream: GameEvent[] = [
    { seq: 1, timestamp: 1000, type: 'ROUND_STARTED', points: 0, combo: 0, multiplier: 1 },
    { seq: 2, timestamp: 1200, type: 'TARGET_HIT', points: 100, combo: 1, multiplier: 1 },
    { seq: 3, timestamp: 1500, type: 'TARGET_HIT', points: 200, combo: 2, multiplier: 1 },
    { seq: 4, timestamp: 2000, type: 'ROUND_ENDED', points: 200, combo: 2, multiplier: 1 },
  ];

  it('reports two identical streams as identical and compatible', () => {
    const streamClone = JSON.parse(JSON.stringify(baseStream));
    const result = ReplayDiffService.compareReplays(baseStream, streamClone);

    expect(result.isIdentical).toBe(true);
    expect(result.isCompatible).toBe(true);
    expect(result.divergenceIndex).toBeNull();
    expect(result.maxTimestampDriftMs).toBe(0);
    expect(result.scoreDelta).toBe(0);
  });

  it('detects acceptable sub-threshold timestamp jitter without divergence', () => {
    const jitteredStream: GameEvent[] = [
      { seq: 1, timestamp: 1005, type: 'ROUND_STARTED', points: 0, combo: 0, multiplier: 1 }, // 5ms jitter
      { seq: 2, timestamp: 1210, type: 'TARGET_HIT', points: 100, combo: 1, multiplier: 1 }, // 10ms jitter
      { seq: 3, timestamp: 1500, type: 'TARGET_HIT', points: 200, combo: 2, multiplier: 1 }, // 0ms jitter
      { seq: 4, timestamp: 2015, type: 'ROUND_ENDED', points: 200, combo: 2, multiplier: 1 }, // 15ms jitter
    ];

    const result = ReplayDiffService.compareReplays(baseStream, jitteredStream, {
      maxAllowableDriftMs: 50,
    });

    expect(result.isIdentical).toBe(false); // timestamps differed slightly
    expect(result.isCompatible).toBe(true); // within 50ms tolerance
    expect(result.maxTimestampDriftMs).toBe(15);
    expect(result.scoreDelta).toBe(0);
  });

  it('detects score divergence and pinpoint index', () => {
    const divergentStream: GameEvent[] = [
      { seq: 1, timestamp: 1000, type: 'ROUND_STARTED', points: 0, combo: 0, multiplier: 1 },
      { seq: 2, timestamp: 1200, type: 'TARGET_HIT', points: 100, combo: 1, multiplier: 1 },
      { seq: 3, timestamp: 1500, type: 'TARGET_HIT', points: 999, combo: 2, multiplier: 1 }, // Score mismatch!
      { seq: 4, timestamp: 2000, type: 'ROUND_ENDED', points: 999, combo: 2, multiplier: 1 },
    ];

    const result = ReplayDiffService.compareReplays(baseStream, divergentStream);

    expect(result.isCompatible).toBe(false);
    expect(result.divergenceIndex).toBe(2);
    expect(result.divergenceReason).toContain('Score mismatch at index 2');
  });

  it('rejects streams with mismatched event lengths', () => {
    const truncatedStream = baseStream.slice(0, 2);
    const result = ReplayDiffService.compareReplays(baseStream, truncatedStream);

    expect(result.isCompatible).toBe(false);
    expect(result.divergenceReason).toContain('Event count mismatch');
  });
});
