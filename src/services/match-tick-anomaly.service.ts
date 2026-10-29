export interface MatchTickItem {
  tickIndex: number;
  playerIndex: number;
  action: string;
  payload?: {
    x?: number;
    y?: number;
  };
  timestamp: number;
}

export interface AnomalyDetail {
  tickIndex: number;
  rule: 'RAPID_FIRE' | 'VELOCITY_SPIKE' | 'FUTURE_TIMESTAMP' | 'INVALID_TICK_ORDER';
  message: string;
}

export interface AnomalyScanReport {
  hasAnomalies: boolean;
  anomalyCount: number;
  anomalies: AnomalyDetail[];
}

/**
 * Service evaluating game match tick streams for anti-cheat anomalies,
 * impossible physical velocities, and rate-limit violations.
 */
export class MatchTickAnomalyService {
  public static readonly MIN_FIRE_COOLDOWN_MS = 150;
  public static readonly MAX_VELOCITY_PER_TICK = 100; // max coordinate jump per tick

  /**
   * Scans a tick stream for anomalies.
   */
  public static scanTicks(
    ticks: MatchTickItem[],
    matchEndTime: number = Infinity
  ): AnomalyScanReport {
    const anomalies: AnomalyDetail[] = [];
    let lastFireTimestamp = -Infinity;
    let lastPosition: { x: number; y: number } | null = null;
    let lastTickIndex = -1;

    for (let i = 0; i < ticks.length; i++) {
      const t = ticks[i];

      // Sequential tick order check
      if (t.tickIndex <= lastTickIndex) {
        anomalies.push({
          tickIndex: t.tickIndex,
          rule: 'INVALID_TICK_ORDER',
          message: `Tick index ${t.tickIndex} is not strictly greater than previous ${lastTickIndex}`,
        });
      }
      lastTickIndex = t.tickIndex;

      // Future timestamp check
      if (t.timestamp > matchEndTime) {
        anomalies.push({
          tickIndex: t.tickIndex,
          rule: 'FUTURE_TIMESTAMP',
          message: `Tick timestamp ${t.timestamp} exceeds match end time ${matchEndTime}`,
        });
      }

      // Rapid fire cooldown check
      if (t.action === 'FIRE_WATER_BALLOON') {
        const delta = t.timestamp - lastFireTimestamp;
        if (delta < this.MIN_FIRE_COOLDOWN_MS) {
          anomalies.push({
            tickIndex: t.tickIndex,
            rule: 'RAPID_FIRE',
            message: `Fire interval ${delta}ms is below minimum cooldown of ${this.MIN_FIRE_COOLDOWN_MS}ms`,
          });
        }
        lastFireTimestamp = t.timestamp;
      }

      // Velocity spike check
      if (t.payload && typeof t.payload.x === 'number' && typeof t.payload.y === 'number') {
        if (lastPosition) {
          const dx = t.payload.x - lastPosition.x;
          const dy = t.payload.y - lastPosition.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist > this.MAX_VELOCITY_PER_TICK) {
            anomalies.push({
              tickIndex: t.tickIndex,
              rule: 'VELOCITY_SPIKE',
              message: `Distance delta ${dist.toFixed(1)} exceeds maximum velocity threshold ${this.MAX_VELOCITY_PER_TICK}`,
            });
          }
        }
        lastPosition = { x: t.payload.x, y: t.payload.y };
      }
    }

    return {
      hasAnomalies: anomalies.length > 0,
      anomalyCount: anomalies.length,
      anomalies,
    };
  }
}
