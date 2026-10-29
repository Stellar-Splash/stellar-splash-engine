export interface EntryFeePayment {
  tournamentId: string;
  playerAddress: string;
  amount: bigint;
  txHash: string;
  recordedAt: number;
}

export interface ReconciliationReport {
  tournamentId: string;
  totalCollected: bigint;
  expectedTotal: bigint;
  difference: bigint;
  isBalanced: boolean;
  collectedCount: number;
  expectedPlayerCount: number;
  payments: EntryFeePayment[];
}

/**
 * Service for tracking, auditing, and reconciling tournament entry fees
 * deposited into Soroban escrow vaults.
 */
export class EntryFeeReconciliationService {
  private static paymentsByTournament: Map<string, Map<string, EntryFeePayment>> = new Map();

  /**
   * Resets all internal stores (used in unit testing).
   */
  public static reset(): void {
    this.paymentsByTournament.clear();
  }

  /**
   * Records a verified on-chain player entry fee payment.
   */
  public static recordPayment(
    tournamentId: string,
    playerAddress: string,
    amount: bigint,
    txHash: string,
    recordedAt: number = Date.now()
  ): EntryFeePayment {
    if (!this.paymentsByTournament.has(tournamentId)) {
      this.paymentsByTournament.set(tournamentId, new Map());
    }

    const tournamentMap = this.paymentsByTournament.get(tournamentId)!;
    const payment: EntryFeePayment = {
      tournamentId,
      playerAddress,
      amount,
      txHash,
      recordedAt,
    };

    tournamentMap.set(playerAddress, payment);
    return payment;
  }

  /**
   * Checks whether a specific player has paid the entry fee for a tournament.
   */
  public static hasPlayerPaid(tournamentId: string, playerAddress: string): boolean {
    const tournamentMap = this.paymentsByTournament.get(tournamentId);
    if (!tournamentMap) return false;
    return tournamentMap.has(playerAddress);
  }

  /**
   * Retrieves all entry fee payments recorded for a tournament.
   */
  public static getPayments(tournamentId: string): EntryFeePayment[] {
    const tournamentMap = this.paymentsByTournament.get(tournamentId);
    if (!tournamentMap) return [];
    return Array.from(tournamentMap.values());
  }

  /**
   * Reconciles total collected entry fees against expected count and rate.
   */
  public static getReconciliationSummary(
    tournamentId: string,
    expectedFeePerPlayer: bigint,
    expectedPlayerCount: number
  ): ReconciliationReport {
    const payments = this.getPayments(tournamentId);
    const collectedCount = payments.length;

    let totalCollected = 0n;
    for (const p of payments) {
      totalCollected += p.amount;
    }

    const expectedTotal = expectedFeePerPlayer * BigInt(expectedPlayerCount);
    const difference = totalCollected - expectedTotal;
    const isBalanced = difference === 0n && collectedCount === expectedPlayerCount;

    return {
      tournamentId,
      totalCollected,
      expectedTotal,
      difference,
      isBalanced,
      collectedCount,
      expectedPlayerCount,
      payments,
    };
  }

  /**
   * Purges recorded payments for a finalized or deleted tournament.
   */
  public static clearTournament(tournamentId: string): void {
    this.paymentsByTournament.delete(tournamentId);
  }
}
