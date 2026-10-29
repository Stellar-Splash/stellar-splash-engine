export type SorobanOperationType =
  | 'CREATE_TOURNAMENT'
  | 'FUND_PRIZE_POOL'
  | 'REGISTER_PARTICIPANT'
  | 'PAY_ENTRY_FEE'
  | 'SUBMIT_DISPUTE'
  | 'EXECUTE_SETTLEMENT'
  | 'UPGRADE_CONTRACT';

export type CongestionLevel = 'LOW' | 'NORMAL' | 'HIGH' | 'EXTREME';

export interface GasProfile {
  cpuInstructions: number;
  ramBytes: number;
  baseFeeStroops: number;
}

export interface GasEstimate {
  operation: SorobanOperationType;
  congestionLevel: CongestionLevel;
  estimatedFeeStroops: number;
  estimatedFeeXlm: number;
  cpuInstructions: number;
  ramBytes: number;
  inclusionPriority: 'Standard' | 'Expedited' | 'Critical';
}

/**
 * Service estimating Soroban resource footprints, CPU/RAM bounds,
 * and Stroop transaction fees across network congestion levels.
 */
export class GasPriceEstimatorService {
  private static currentCongestion: CongestionLevel = 'NORMAL';

  private static readonly PROFILES: Record<SorobanOperationType, GasProfile> = {
    CREATE_TOURNAMENT: { cpuInstructions: 1_200_000, ramBytes: 40_000, baseFeeStroops: 100_000 },
    FUND_PRIZE_POOL: { cpuInstructions: 1_500_000, ramBytes: 50_000, baseFeeStroops: 120_000 },
    REGISTER_PARTICIPANT: { cpuInstructions: 800_000, ramBytes: 25_000, baseFeeStroops: 75_000 },
    PAY_ENTRY_FEE: { cpuInstructions: 1_400_000, ramBytes: 45_000, baseFeeStroops: 115_000 },
    SUBMIT_DISPUTE: { cpuInstructions: 950_000, ramBytes: 30_000, baseFeeStroops: 90_000 },
    EXECUTE_SETTLEMENT: { cpuInstructions: 3_500_000, ramBytes: 120_000, baseFeeStroops: 250_000 },
    UPGRADE_CONTRACT: { cpuInstructions: 4_000_000, ramBytes: 150_000, baseFeeStroops: 300_000 },
  };

  private static readonly MULTIPLIERS: Record<CongestionLevel, number> = {
    LOW: 1.0,
    NORMAL: 1.2,
    HIGH: 1.8,
    EXTREME: 2.5,
  };

  /**
   * Sets network congestion tier.
   */
  public static setCongestionLevel(level: CongestionLevel): void {
    this.currentCongestion = level;
  }

  /**
   * Reads current network congestion tier.
   */
  public static getCongestionLevel(): CongestionLevel {
    return this.currentCongestion;
  }

  /**
   * Computes dynamic gas fee and resource estimate for an operation.
   */
  public static estimateFee(
    operation: SorobanOperationType,
    level: CongestionLevel = this.currentCongestion
  ): GasEstimate {
    const profile = this.PROFILES[operation] || {
      cpuInstructions: 1_000_000,
      ramBytes: 30_000,
      baseFeeStroops: 100_000,
    };

    const multiplier = this.MULTIPLIERS[level];
    const estimatedFeeStroops = Math.round(profile.baseFeeStroops * multiplier);
    const estimatedFeeXlm = estimatedFeeStroops / 10_000_000;

    let inclusionPriority: 'Standard' | 'Expedited' | 'Critical' = 'Standard';
    if (level === 'HIGH') inclusionPriority = 'Expedited';
    if (level === 'EXTREME') inclusionPriority = 'Critical';

    return {
      operation,
      congestionLevel: level,
      estimatedFeeStroops,
      estimatedFeeXlm,
      cpuInstructions: profile.cpuInstructions,
      ramBytes: profile.ramBytes,
      inclusionPriority,
    };
  }
}
