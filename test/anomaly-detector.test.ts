import { describe, it, expect } from 'vitest';
import { AnomalyDetectorService } from '../src/services/anomaly-detector.service';
import { GameEvent } from '../src/types';

describe('AnomalyDetectorService - Statistical Bot & Macro Detection', () => {
  it('certifies natural human gameplay event stream as clean and trusted', () => {
    const naturalEvents: GameEvent[] = [
      { seq: 1, timestamp: 1000, type: 'ROUND_STARTED', points: 0, combo: 0, multiplier: 1 },
      { seq: 2, timestamp: 1250, type: 'TARGET_HIT', points: 100, combo: 1, multiplier: 1, data: { x: 120, y: 340 } },
      { seq: 3, timestamp: 1610, type: 'TARGET_HIT', points: 150, combo: 2, multiplier: 1, data: { x: 280, y: 190 } },
      { seq: 4, timestamp: 1980, type: 'TARGET_HIT', points: 200, combo: 3, multiplier: 1, data: { x: 450, y: 510 } },
      { seq: 5, timestamp: 2450, type: 'TARGET_HIT', points: 250, combo: 4, multiplier: 1, data: { x: 310, y: 220 } },
      { seq: 6, timestamp: 2890, type: 'TARGET_HIT', points: 300, combo: 5, multiplier: 1, data: { x: 190, y: 440 } },
      { seq: 7, timestamp: 3000, type: 'ROUND_ENDED', points: 1000, combo: 5, multiplier: 1 },
    ];

    const result = AnomalyDetectorService.analyzeMatchEvents(naturalEvents);
    expect(result.riskScore).toBeLessThan(30);
    expect(result.isSuspicious).toBe(false);
    expect(result.flags.length).toBe(0);
    expect(AnomalyDetectorService.isTrusted(naturalEvents)).toBe(true);
  });

  it('detects robotic macro with zero-jitter fixed intervals', () => {
    // 10 clicks exactly 50ms apart (synthetic macro)
    const macroEvents: GameEvent[] = [];
    for (let i = 0; i < 10; i++) {
      macroEvents.push({
        seq: i + 1,
        timestamp: 1000 + i * 50, // Exactly 50ms interval every time
        type: 'TARGET_HIT',
        points: 100,
        combo: i + 1,
        multiplier: 1,
        data: { x: 100 + i * 10, y: 200 + i * 5 },
      });
    }

    const result = AnomalyDetectorService.analyzeMatchEvents(macroEvents);
    expect(result.metrics.intervalStdDev).toBeLessThan(2);
    expect(result.flags.some((f) => f.includes('SYNTHETIC_INTERVAL_REGULARITY'))).toBe(true);
    expect(result.riskScore).toBeGreaterThanOrEqual(50);
    expect(result.isSuspicious).toBe(true);
    expect(AnomalyDetectorService.isTrusted(macroEvents)).toBe(false);
  });

  it('detects inhuman autoclicker bursts under 40ms', () => {
    const burstEvents: GameEvent[] = [
      { seq: 1, timestamp: 1000, type: 'TARGET_HIT', points: 10, combo: 1, multiplier: 1 },
      { seq: 2, timestamp: 1010, type: 'TARGET_HIT', points: 10, combo: 2, multiplier: 1 }, // 10ms
      { seq: 3, timestamp: 1022, type: 'TARGET_HIT', points: 10, combo: 3, multiplier: 1 }, // 12ms
      { seq: 4, timestamp: 1035, type: 'TARGET_HIT', points: 10, combo: 4, multiplier: 1 }, // 13ms
      { seq: 5, timestamp: 1050, type: 'TARGET_HIT', points: 10, combo: 5, multiplier: 1 }, // 15ms
    ];

    const result = AnomalyDetectorService.analyzeMatchEvents(burstEvents);
    expect(result.metrics.inhumanRapidClicksCount).toBeGreaterThanOrEqual(3);
    expect(result.flags.some((f) => f.includes('INHUMAN_BURST_RATE'))).toBe(true);
    expect(result.riskScore).toBeGreaterThanOrEqual(40);
  });
});
