import { AllocationRule, PrizeAgreement } from '../types';
import { CanonicalService } from './canonical.service';

export interface CalculatedPayout {
  rank: number;
  basisPoints: number;
  payoutAmount: number;
  isResidualRecipient: boolean;
}

export class AgreementService {
  /**
   * Validates that allocation rules sum exactly to 10,000 basis points (100.00%).
   */
  public static validateBasisPoints(rules: AllocationRule[]): { valid: boolean; totalBps: number; error?: string } {
    if (!rules || rules.length === 0) {
      return { valid: false, totalBps: 0, error: 'At least one allocation rule is required.' };
    }

    let totalBps = 0;
    for (const r of rules) {
      if (r.basisPoints <= 0 || !Number.isInteger(r.basisPoints)) {
        return {
          valid: false,
          totalBps,
          error: `Invalid basis points for rank ${r.rank}: must be positive integer.`,
        };
      }
      totalBps += r.basisPoints;
    }

    if (totalBps !== 10_000) {
      return {
        valid: false,
        totalBps,
        error: `INVALID_BASIS_POINTS: Total allocation must equal exactly 10,000 basis points (100%), got ${totalBps} bps.`,
      };
    }

    return { valid: true, totalBps };
  }

  /**
   * Deterministically calculates exact token payouts from prize pool and rules.
   * Handles rounding and dust by awarding remainder to Rank 1.
   */
  public static calculatePayouts(totalAmount: number, rules: AllocationRule[]): CalculatedPayout[] {
    const sorted = [...rules].sort((a, b) => a.rank - b.rank);
    let distributed = 0;
    const payouts: CalculatedPayout[] = [];

    for (const r of sorted) {
      // Deterministic integer floor allocation
      const portion = Math.floor((totalAmount * r.basisPoints) / 10_000);
      distributed += portion;
      payouts.push({
        rank: r.rank,
        basisPoints: r.basisPoints,
        payoutAmount: portion,
        isResidualRecipient: false,
      });
    }

    // Residual dust assigned deterministically to Rank 1
    const remainder = totalAmount - distributed;
    if (remainder > 0 && payouts.length > 0) {
      payouts[0].payoutAmount += remainder;
      payouts[0].isResidualRecipient = true;
    }

    return payouts;
  }

  /**
   * Alias helper to calculate settlement allocations with explicit amount fields.
   */
  public static calculateSettlementAllocations(
    totalAmount: number,
    rules: AllocationRule[]
  ): { rank: number; basisPoints: number; amount: number; isResidualRecipient: boolean }[] {
    return this.calculatePayouts(totalAmount, rules).map((p) => ({
      rank: p.rank,
      basisPoints: p.basisPoints,
      amount: p.payoutAmount,
      isResidualRecipient: p.isResidualRecipient,
    }));
  }

  /**
   * Creates a new PrizeAgreement instance with canonical agreement hash.
   */
  public static createAgreement(params: {
    tournamentId: string;
    version: number;
    prizeAsset: string;
    prizePoolAmount: number;
    allocationRules: AllocationRule[];
    createdBy: string;
  }): PrizeAgreement {
    const validation = this.validateBasisPoints(params.allocationRules);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const agreementId = `agr-${params.tournamentId}-v${params.version}`;
    const baseAgreement: Omit<PrizeAgreement, 'agreementHash' | 'status'> = {
      agreementId,
      tournamentId: params.tournamentId,
      version: params.version,
      prizeAsset: params.prizeAsset,
      prizePoolAmount: params.prizePoolAmount,
      rankingMethod: 'FINAL_VERIFIED_SCORE',
      allocationRules: params.allocationRules,
      tieRule: 'SCORE_THEN_ACCURACY_THEN_TIMESTAMP',
      roundingRule: 'INTEGER_FLOOR_REMAINDER_TO_RANK_1',
      residualRule: 'ALLOCATE_DUST_TO_FIRST_PLACE',
      createdBy: params.createdBy,
      createdAt: Date.now(),
    };

    const agreementHash = CanonicalService.computeAgreementHash(baseAgreement as any);

    return {
      ...baseAgreement,
      agreementHash,
      status: 'PENDING_APPROVAL',
    };
  }
}
