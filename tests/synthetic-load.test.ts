import { describe, it, expect } from 'vitest';

interface SyntheticPlayer {
  playerId: string;
  wallet: string;
  score: number;
  mouseMovementsCount: number;
  clicksCount: number;
}

function generateSyntheticPlayer(idx: number): SyntheticPlayer {
  return {
    playerId: `SYNTH_PLAYER_${idx.toString().padStart(3, '0')}`,
    wallet: `GBZX${idx.toString().padStart(48, '0')}TEST`,
    score: Math.floor(Math.random() * 5000) + 500,
    mouseMovementsCount: Math.floor(Math.random() * 80) + 40,
    clicksCount: Math.floor(Math.random() * 30) + 10,
  };
}

describe('Synthetic Load Generator', () => {
  it('generates 100 correctly formatted player telemetry instances', () => {
    const players = Array.from({ length: 100 }, (_, i) => generateSyntheticPlayer(i + 1));
    expect(players).toHaveLength(100);

    const first = players[0];
    expect(first.playerId).toBe('SYNTH_PLAYER_001');
    expect(first.wallet.startsWith('GBZX')).toBe(true);
    expect(first.wallet).toHaveLength(56);
    expect(first.score).toBeGreaterThanOrEqual(500);
    expect(first.mouseMovementsCount).toBeGreaterThanOrEqual(40);
  });
});

