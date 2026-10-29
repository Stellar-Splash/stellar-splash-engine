import { describe, it, expect } from 'vitest';
import {
  MatchTickAnomalyService,
  MatchTickItem,
} from '../src/services/match-tick-anomaly.service';

describe('MatchTickAnomalyService', () => {
  it('reports no anomalies for clean sequential ticks', () => {
    const cleanTicks: MatchTickItem[] = [
      { tickIndex: 0, playerIndex: 0, action: 'MOVE', payload: { x: 10, y: 10 }, timestamp: 100 },
      { tickIndex: 1, playerIndex: 0, action: 'MOVE', payload: { x: 20, y: 15 }, timestamp: 200 },
      { tickIndex: 2, playerIndex: 0, action: 'FIRE_WATER_BALLOON', timestamp: 400 },
    ];

    const report = MatchTickAnomalyService.scanTicks(cleanTicks, 1000);
    expect(report.hasAnomalies).toBe(false);
    expect(report.anomalyCount).toBe(0);
  });

  it('detects rapid fire violations', () => {
    const rapidTicks: MatchTickItem[] = [
      { tickIndex: 0, playerIndex: 0, action: 'FIRE_WATER_BALLOON', timestamp: 100 },
      { tickIndex: 1, playerIndex: 0, action: 'FIRE_WATER_BALLOON', timestamp: 150 }, // only 50ms gap
    ];

    const report = MatchTickAnomalyService.scanTicks(rapidTicks, 1000);
    expect(report.hasAnomalies).toBe(true);
    expect(report.anomalies.find((a) => a.rule === 'RAPID_FIRE')).toBeDefined();
  });

  it('detects velocity spikes (teleportation)', () => {
    const teleportTicks: MatchTickItem[] = [
      { tickIndex: 0, playerIndex: 0, action: 'MOVE', payload: { x: 10, y: 10 }, timestamp: 100 },
      { tickIndex: 1, playerIndex: 0, action: 'MOVE', payload: { x: 500, y: 500 }, timestamp: 150 },
    ];

    const report = MatchTickAnomalyService.scanTicks(teleportTicks, 1000);
    expect(report.hasAnomalies).toBe(true);
    expect(report.anomalies.find((a) => a.rule === 'VELOCITY_SPIKE')).toBeDefined();
  });

  it('detects non-sequential tick indices', () => {
    const outOfOrderTicks: MatchTickItem[] = [
      { tickIndex: 5, playerIndex: 0, action: 'MOVE', timestamp: 100 },
      { tickIndex: 2, playerIndex: 0, action: 'MOVE', timestamp: 150 },
    ];

    const report = MatchTickAnomalyService.scanTicks(outOfOrderTicks, 1000);
    expect(report.hasAnomalies).toBe(true);
    expect(report.anomalies.find((a) => a.rule === 'INVALID_TICK_ORDER')).toBeDefined();
  });
});
