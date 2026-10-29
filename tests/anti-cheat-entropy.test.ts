import { describe, it, expect } from 'vitest';
import { AntiCheatEntropyService } from '../src/services/anti-cheat-entropy.service';
import { PlayerInputTelemetry } from '../src/types/anti-cheat-entropy';

describe('AntiCheatEntropyService', () => {
  it('detects high linearity bot trajectory', () => {
    // 25 points along an exact straight line y = 2x
    const movements = Array.from({ length: 25 }, (_, i) => ({
      x: i * 10,
      y: i * 20,
      timestamp: Date.now() + i * 16,
    }));

    const linearity = AntiCheatEntropyService.calculateLinearity(movements);
    expect(linearity).toBeGreaterThanOrEqual(0.99);

    const telemetry: PlayerInputTelemetry = {
      playerId: 'BOT_PLAYER_1',
      matchId: 'MATCH_999',
      gameDurationMs: 5000,
      mouseMovements: movements,
      clicks: [],
      keyPressIntervalsMs: [120, 115, 130],
    };

    const report = AntiCheatEntropyService.evaluate(telemetry);
    expect(report.isFlaggedSuspicious).toBe(true);
    expect(report.reasons.some((r) => r.includes('linearity'))).toBe(true);
  });

  it('permits natural human curves with tremors', () => {
    // Points with sinusoidal natural curve
    const movements = Array.from({ length: 30 }, (_, i) => ({
      x: i * 10,
      y: 100 + Math.sin(i * 0.4) * 40 + (i % 2 === 0 ? 2 : -2),
      timestamp: Date.now() + i * 16,
    }));

    const linearity = AntiCheatEntropyService.calculateLinearity(movements);
    expect(linearity).toBeLessThan(0.95);

    const telemetry: PlayerInputTelemetry = {
      playerId: 'HUMAN_PLAYER_1',
      matchId: 'MATCH_998',
      gameDurationMs: 10000,
      mouseMovements: movements,
      clicks: [
        { x: 10, y: 20, timestamp: 1000 },
        { x: 15, y: 22, timestamp: 1250 },
        { x: 20, y: 25, timestamp: 1600 },
      ],
      keyPressIntervalsMs: [120, 185, 95, 210, 140, 160],
    };

    const report = AntiCheatEntropyService.evaluate(telemetry);
    expect(report.isFlaggedSuspicious).toBe(false);
    expect(report.reasons).toHaveLength(0);
  });

  it('flags superhuman click bursts under 25ms', () => {
    const telemetry: PlayerInputTelemetry = {
      playerId: 'AUTOCLICKER_1',
      matchId: 'MATCH_997',
      gameDurationMs: 5000,
      mouseMovements: [],
      clicks: [
        { x: 50, y: 50, timestamp: 1000 },
        { x: 50, y: 50, timestamp: 1010 }, // 10ms
        { x: 50, y: 50, timestamp: 1022 }, // 12ms
        { x: 50, y: 50, timestamp: 1035 }, // 13ms
      ],
      keyPressIntervalsMs: [],
    };

    const report = AntiCheatEntropyService.evaluate(telemetry);
    expect(report.isFlaggedSuspicious).toBe(true);
    expect(report.reasons.some((r) => r.includes('Superhuman click'))).toBe(true);
  });
});
