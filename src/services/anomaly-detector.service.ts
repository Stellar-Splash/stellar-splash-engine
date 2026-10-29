import { GameEvent } from '../types';

export interface FraudAnalysisMetrics {
  totalEvents: number;
  hitEvents: number;
  averageIntervalMs: number;
  minIntervalMs: number;
  intervalVariance: number;
  intervalStdDev: number;
  inhumanRapidClicksCount: number;
  perfectCoordinateClumpsCount: number;
}

export interface FraudAnalysisResult {
  riskScore: number; // 0 (Clean) to 100 (Blatant Bot / Macro)
  isSuspicious: boolean;
  flags: string[];
  metrics: FraudAnalysisMetrics;
}

export class AnomalyDetectorService {
  public static readonly DEFAULT_RISK_THRESHOLD = 50;

  /**
   * Analyzes a series of recorded game events for statistical anomalies,
   * macro patterns, and sub-human reaction timing.
   */
  public static analyzeMatchEvents(events: GameEvent[]): FraudAnalysisResult {
    const flags: string[] = [];
    let riskScore = 0;

    const hitEvents = events.filter(
      (e) => e.type === 'TARGET_HIT' || e.type === 'TARGET_MISSED' || e.type === 'HAZARD_HIT',
    );

    if (hitEvents.length === 0) {
      return {
        riskScore: 0,
        isSuspicious: false,
        flags: [],
        metrics: {
          totalEvents: events.length,
          hitEvents: 0,
          averageIntervalMs: 0,
          minIntervalMs: 0,
          intervalVariance: 0,
          intervalStdDev: 0,
          inhumanRapidClicksCount: 0,
          perfectCoordinateClumpsCount: 0,
        },
      };
    }

    // 1. Time Interval & Reaction Time Analysis
    const intervals: number[] = [];
    let minIntervalMs = Infinity;
    let inhumanRapidClicksCount = 0;

    for (let i = 1; i < hitEvents.length; i++) {
      const delta = hitEvents[i].timestamp - hitEvents[i - 1].timestamp;
      if (delta >= 0) {
        intervals.push(delta);
        if (delta < minIntervalMs) minIntervalMs = delta;

        // Clicks faster than 40ms (~25 clicks per second) are virtually impossible for human fingers
        if (delta < 40) {
          inhumanRapidClicksCount++;
        }
      }
    }

    if (minIntervalMs === Infinity) minIntervalMs = 0;

    // Check for inhuman click frequency
    if (inhumanRapidClicksCount >= 3) {
      riskScore += Math.min(45, inhumanRapidClicksCount * 15);
      flags.push(`INHUMAN_BURST_RATE: ${inhumanRapidClicksCount} clicks under 40ms`);
    }

    // 2. Statistical Variance & Standard Deviation (Autoclicker / Fixed-Delay Bot Detection)
    let averageIntervalMs = 0;
    let intervalVariance = 0;
    let intervalStdDev = 0;

    if (intervals.length >= 5) {
      const sum = intervals.reduce((acc, val) => acc + val, 0);
      averageIntervalMs = Math.round(sum / intervals.length);

      const squaredDiffs = intervals.map((val) => Math.pow(val - averageIntervalMs, 2));
      intervalVariance = Math.round(squaredDiffs.reduce((a, b) => a + b, 0) / intervals.length);
      intervalStdDev = Math.round(Math.sqrt(intervalVariance));

      // Humans have natural jitter (std dev typically > 25ms).
      // Fixed macro delays exhibit almost zero variance (std dev < 3ms).
      if (intervalStdDev < 4 && averageIntervalMs < 500) {
        riskScore += 50;
        flags.push(`SYNTHETIC_INTERVAL_REGULARITY: Standard deviation ${intervalStdDev}ms indicates automated macro`);
      }
    }

    // 3. Coordinate Uniformity / Pixel-Perfect Clumping Analysis
    let perfectCoordinateClumpsCount = 0;
    const coordMap = new Map<string, number>();

    for (const e of hitEvents) {
      if (e.data && typeof e.data.x === 'number' && typeof e.data.y === 'number') {
        const coordKey = `${Math.round(e.data.x)},${Math.round(e.data.y)}`;
        const count = (coordMap.get(coordKey) || 0) + 1;
        coordMap.set(coordKey, count);
        if (count >= 5) {
          perfectCoordinateClumpsCount++;
        }
      }
    }

    if (perfectCoordinateClumpsCount >= 5) {
      riskScore += 30;
      flags.push(`REPEATED_EXACT_COORDINATES: ${perfectCoordinateClumpsCount} repeated static pixel hits`);
    }

    // Normalize risk score to 0..100
    riskScore = Math.min(100, Math.max(0, riskScore));

    return {
      riskScore,
      isSuspicious: riskScore >= this.DEFAULT_RISK_THRESHOLD,
      flags,
      metrics: {
        totalEvents: events.length,
        hitEvents: hitEvents.length,
        averageIntervalMs,
        minIntervalMs,
        intervalVariance,
        intervalStdDev,
        inhumanRapidClicksCount,
        perfectCoordinateClumpsCount,
      },
    };
  }

  /**
   * Quick boolean check to certify whether a replay is free of anomalous bot signals.
   */
  public static isTrusted(
    events: GameEvent[],
    threshold: number = AnomalyDetectorService.DEFAULT_RISK_THRESHOLD,
  ): boolean {
    const analysis = this.analyzeMatchEvents(events);
    return analysis.riskScore < threshold;
  }
}
