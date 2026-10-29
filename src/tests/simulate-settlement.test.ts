import { describe, it, expect } from 'vitest';
// @ts-expect-error cjs script
import { simulateSettlement } from '../../scripts/simulate-settlement-flow.cjs';

describe('Settlement Flow Simulator', () => {
  it('correctly calculates 50/30/20 split without deficit', () => {
    const res = simulateSettlement(101, 1000);
    expect(res.tournamentId).toBe(101);
    expect(res.totalPrizeXlm).toBe(1000);
    expect(res.totalDisbursed).toBe(1000);
    expect(res.remainder).toBe(0);
  });

  it('preserves dust remainder on indivisible pools', () => {
    const res = simulateSettlement(102, 1001);
    expect(res.totalDisbursed + res.remainder).toBe(1001);
  });
});

