import { describe, it, expect, beforeEach } from 'vitest';
import { GasPriceEstimatorService } from '../src/services/gas-price-estimator.service';

describe('GasPriceEstimatorService', () => {
  beforeEach(() => {
    GasPriceEstimatorService.setCongestionLevel('NORMAL');
  });

  it('estimates fee accurately for normal congestion', () => {
    const est = GasPriceEstimatorService.estimateFee('FUND_PRIZE_POOL');
    // Base 120,000 * 1.2 = 144,000 Stroops
    expect(est.estimatedFeeStroops).toBe(144_000);
    expect(est.estimatedFeeXlm).toBe(0.0144);
    expect(est.cpuInstructions).toBe(1_500_000);
    expect(est.inclusionPriority).toBe('Standard');
  });

  it('scales fee dynamically during extreme congestion', () => {
    const est = GasPriceEstimatorService.estimateFee('EXECUTE_SETTLEMENT', 'EXTREME');
    // Base 250,000 * 2.5 = 625,000 Stroops
    expect(est.estimatedFeeStroops).toBe(625_000);
    expect(est.inclusionPriority).toBe('Critical');
  });

  it('maintains global congestion state', () => {
    GasPriceEstimatorService.setCongestionLevel('HIGH');
    expect(GasPriceEstimatorService.getCongestionLevel()).toBe('HIGH');

    const est = GasPriceEstimatorService.estimateFee('REGISTER_PARTICIPANT');
    // Base 75,000 * 1.8 = 135,000 Stroops
    expect(est.estimatedFeeStroops).toBe(135_000);
    expect(est.inclusionPriority).toBe('Expedited');
  });
});
