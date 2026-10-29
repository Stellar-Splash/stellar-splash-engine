import { PlayerInputTelemetry, AntiCheatEntropyReport, TrajectoryPoint } from '../types/anti-cheat-entropy';

export class AntiCheatEntropyService {
  /**
   * Calculates Shannon entropy across angle distribution of trajectory
   */
  public static calculateAngularEntropy(points: TrajectoryPoint[]): number {
    if (points.length < 5) return 0.5; // Not enough data, return neutral

    const angleBins = new Array(12).fill(0); // 30-degree bins (360 / 12)
    let totalAngles = 0;

    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      if (dx === 0 && dy === 0) continue;

      let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (angle < 0) angle += 360;

      const binIndex = Math.min(Math.floor(angle / 30), 11);
      angleBins[binIndex]++;
      totalAngles++;
    }

    if (totalAngles === 0) return 0.0;

    // Shannon entropy: - sum(p * log2(p)) normalized by log2(bins)
    let entropy = 0;
    for (const count of angleBins) {
      if (count > 0) {
        const p = count / totalAngles;
        entropy -= p * Math.log2(p);
      }
    }

    const maxEntropy = Math.log2(12);
    return Math.min(Math.max(entropy / maxEntropy, 0), 1.0);
  }

  /**
   * Calculates path linearity (Euclidean start-to-end vs total distance traversed)
   */
  public static calculateLinearity(points: TrajectoryPoint[]): number {
    if (points.length < 3) return 0.5;

    const start = points[0];
    const end = points[points.length - 1];

    const netDistance = Math.hypot(end.x - start.x, end.y - start.y);
    if (netDistance === 0) return 0;

    let totalPathLength = 0;
    for (let i = 1; i < points.length; i++) {
      totalPathLength += Math.hypot(
        points[i].x - points[i - 1].x,
        points[i].y - points[i - 1].y
      );
    }

    if (totalPathLength === 0) return 0;

    // A perfect straight line bot has netDistance == totalPathLength (ratio = 1.0)
    // Human trajectories always exhibit subtle curve jitter (ratio < 0.88)
    return Math.min(netDistance / totalPathLength, 1.0);
  }

  /**
   * Evaluates input telemetry against anti-cheat heuristics
   */
  public static evaluate(telemetry: PlayerInputTelemetry): AntiCheatEntropyReport {
    const reasons: string[] = [];
    const entropyScore = this.calculateAngularEntropy(telemetry.mouseMovements);
    const linearity = this.calculateLinearity(telemetry.mouseMovements);

    // Heuristic 1: Unnatural mechanical linearity (e.g., straight line bot)
    if (telemetry.mouseMovements.length >= 20 && linearity > 0.98) {
      reasons.push('Anomalous cursor linearity detected (exceeds 98% straight line trajectory)');
    }

    // Heuristic 2: Zero movement entropy (perfect locked angles)
    if (telemetry.mouseMovements.length >= 20 && entropyScore < 0.15) {
      reasons.push('Sub-human angular entropy (lack of natural micro-tremor)');
    }

    // Heuristic 3: Superhuman click intervals (< 25ms repeated)
    let ultraFastClicks = 0;
    for (let i = 1; i < telemetry.clicks.length; i++) {
      const delta = telemetry.clicks[i].timestamp - telemetry.clicks[i - 1].timestamp;
      if (delta > 0 && delta < 25) {
        ultraFastClicks++;
      }
    }
    if (ultraFastClicks >= 3) {
      reasons.push(`Superhuman click frequency detected (${ultraFastClicks} clicks under 25ms)`);
    }

    // Reaction time variance
    let variance = 50.0;
    if (telemetry.keyPressIntervalsMs.length > 5) {
      const mean =
        telemetry.keyPressIntervalsMs.reduce((a, b) => a + b, 0) /
        telemetry.keyPressIntervalsMs.length;
      const sqDiffs = telemetry.keyPressIntervalsMs.map((v) => Math.pow(v - mean, 2));
      variance = Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / sqDiffs.length);

      // Inhumanly constant keypress rhythm (variance < 2ms)
      if (variance < 2.0) {
        reasons.push('Inhumanly uniform keypress intervals (variance < 2ms)');
      }
    }

    const isFlagged = reasons.length > 0;

    return {
      playerId: telemetry.playerId,
      matchId: telemetry.matchId,
      movementEntropyScore: Math.round(entropyScore * 1000) / 1000,
      reactionTimeVariance: Math.round(variance * 100) / 100,
      linearityScore: Math.round(linearity * 1000) / 1000,
      isFlaggedSuspicious: isFlagged,
      reasons,
      evaluatedAt: Date.now(),
    };
  }
}
