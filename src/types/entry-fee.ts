/**
 * Entry Fee Data Models & Interfaces
 * Provides data contracts for tournament entry fee collection, escrow verification,
 * and ledger reconciliation.
 */

export interface EntryFeeModel {
  tournamentId: string;
  feeAsset: string;
  feeAmount: bigint;
  isMandatory: boolean;
  escrowVaultAddress: string;
  configuredAt: number;
}

export interface PlayerEntryReceipt {
  tournamentId: string;
  playerAddress: string;
  feeAmount: bigint;
  feeAsset: string;
  txHash: string;
  ledgerNumber?: number;
  recordedAt: number;
}

export interface EntryFeeReconciliationSummary {
  tournamentId: string;
  totalCollected: bigint;
  expectedTotal: bigint;
  variance: bigint;
  isBalanced: boolean;
  collectedCount: number;
  expectedParticipants: number;
  payments: PlayerEntryReceipt[];
}

export interface AllowlistedToken {
  contractAddress: string;
  symbol: string;
  decimals: number;
  issuer?: string;
  isNative: boolean;
  addedAt: number;
}
