export interface TrajectoryPoint {
  x: number;
  y: number;
  timestamp: number;
  pressure?: number;
}

export interface PlayerInputTelemetry {
  playerId: string;
  matchId: string;
  gameDurationMs: number;
  mouseMovements: TrajectoryPoint[];
  clicks: TrajectoryPoint[];
  keyPressIntervalsMs: number[];
}

export interface AntiCheatEntropyReport {
  playerId: string;
  matchId: string;
  movementEntropyScore: number; // 0.0 (perfect bot/line) to 1.0 (natural human jitter)
  reactionTimeVariance: number;
  linearityScore: number; // 1.0 = straight line bot, <0.7 = human curve
  isFlaggedSuspicious: boolean;
  reasons: string[];
  evaluatedAt: number;
}
