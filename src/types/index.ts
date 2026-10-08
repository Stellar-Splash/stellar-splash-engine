export type TournamentState =
  | 'DRAFT'
  | 'FUNDING'
  | 'OPEN'
  | 'FULL'
  | 'IN_PROGRESS'
  | 'RESULTS_PENDING'
  | 'VERIFYING'
  | 'VERIFIED'
  | 'FINALIZED'
  | 'SETTLING'
  | 'SETTLED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface Tournament {
  id: string;
  name: string;
  description: string;
  gameId: string;
  gameVersion: string;
  creatorWallet: string;
  prizeAsset: string;
  prizePoolAmount: number;
  vaultAddress: string;
  maxParticipants: number;
  currentParticipants: number;
  startTime: number;
  endTime: number;
  state: TournamentState;
  fundingTxHash?: string;
  fundingVerifiedAt?: number;
  activeAgreementVersion?: number;
  finalRankingHash?: string;
  settlementId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface TournamentParticipant {
  tournamentId: string;
  playerWallet: string;
  joinedAt: number;
  matchesPlayed: number;
  bestScore: number;
  status: 'ACTIVE' | 'DISQUALIFIED';
}

export type GameEventType =
  | 'TARGET_HIT'
  | 'TARGET_MISSED'
  | 'COMBO_STREAK'
  | 'COMBO_RESET'
  | 'HAZARD_HIT'
  | 'MULTIPLIER_UP'
  | 'ROUND_STARTED'
  | 'ROUND_ENDED';

export interface GameEvent {
  seq: number;
  timestamp: number;
  type: GameEventType;
  points: number;
  combo: number;
  multiplier: number;
  data?: Record<string, unknown>;
}

export type MatchStatus =
  | 'CREATED'
  | 'STARTED'
  | 'PLAYING'
  | 'COMPLETED'
  | 'RESULT_PENDING'
  | 'VERIFYING'
  | 'VERIFIED'
  | 'INVALID'
  | 'REJECTED'
  | 'VERIFICATION_FAILED';

export interface MatchSession {
  matchId: string;
  tournamentId: string;
  playerWallet: string;
  gameId: string;
  gameVersion: string;
  sessionToken: string;
  startTime: number;
  endTime?: number;
  status: MatchStatus;
  events?: GameEvent[];
}

export interface GameResult {
  matchId: string;
  tournamentId: string;
  playerWallet: string;
  gameVersion: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  eventsCount: number;
  baseScore: number;
  comboBonus: number;
  multiplierBonus: number;
  penalties: number;
  finalScore: number;
  accuracy: number;
  maxCombo: number;
  resultHash: string;
  submittedAt: number;
  verified: boolean;
}

// ----------------------------------------------------------------------
// RESULT VERIFICATION & ATTESTATION TYPES
// ----------------------------------------------------------------------

export interface ResultVerification {
  verificationId: string;
  matchId: string;
  tournamentId: string;
  playerWallet: string;
  gameVersion: string;
  submittedScore: number;
  replayedScore: number;
  scoreMatch: boolean;
  resultHash: string;
  verificationAlgorithm: string;
  verificationVersion: string;
  verifier: string;
  verifiedAt: number;
  status: 'VERIFIED' | 'VERIFICATION_FAILED' | 'REJECTED';
  rejectionReason?: string;
  attestation?: ResultAttestation;
}

export interface ResultAttestation {
  attestationId: string;
  tournamentId: string;
  matchId: string;
  playerWallet: string;
  resultHash: string;
  finalScore: number;
  verificationVersion: string;
  verifierIdentity: string;
  timestamp: number;
  attestationDigest: string;
}

// ----------------------------------------------------------------------
// TOURNAMENT RANKING TYPES
// ----------------------------------------------------------------------

export interface RankingEntry {
  rank: number;
  playerWallet: string;
  score: number;
  accuracy: number;
  completedAt: number;
  matchId: string;
  resultHash: string;
}

export interface FinalRankingRecord {
  tournamentId: string;
  rankingVersion: number;
  entries: RankingEntry[];
  rankingHash: string;
  finalizedAt: number;
  finalizedBy: string;
}

// ----------------------------------------------------------------------
// PRIZE AGREEMENT TYPES
// ----------------------------------------------------------------------

export type AgreementStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'READY_TO_LOCK'
  | 'LOCKED'
  | 'SUPERSEDED'
  | 'REJECTED';

export interface AllocationRule {
  rank: number;
  basisPoints: number; // e.g. 5000 bps = 50.00%
  label: string;
}

export interface PrizeAgreement {
  agreementId: string;
  tournamentId: string;
  version: number;
  prizeAsset: string;
  prizePoolAmount: number;
  rankingMethod: 'FINAL_VERIFIED_SCORE';
  allocationRules: AllocationRule[];
  tieRule: 'SCORE_THEN_ACCURACY_THEN_TIMESTAMP';
  roundingRule: 'INTEGER_FLOOR_REMAINDER_TO_RANK_1';
  residualRule: 'ALLOCATE_DUST_TO_FIRST_PLACE';
  agreementHash: string;
  status: AgreementStatus;
  createdBy: string;
  createdAt: number;
  approvedBy?: string;
  approvedAt?: number;
  approvalSignature?: string;
  lockedAt?: number;
}

export interface PrizePoolFunding {
  tournamentId: string;
  txHash: string;
  funderWallet: string;
  destinationVault: string;
  asset: string;
  amount: number;
  ledger: number;
  verifiedAt: number;
  explorerUrl: string;
  status: 'CONFIRMED' | 'REJECTED';
}

export interface ReconciliationRecord {
  tournamentId: string;
  expectedAmount: number;
  onChainAmount: number;
  asset: string;
  status: 'RECONCILED' | 'RECONCILIATION_REQUIRED';
  lastCheckedAt: number;
  details: string;
}

export interface AuditEvent {
  id: string;
  timestamp: number;
  eventType: string;
  actor: string;
  details: Record<string, unknown>;
}

// ----------------------------------------------------------------------
// SETTLEMENT & PAYOUT TYPES
// ----------------------------------------------------------------------

export type SettlementStatus =
  | 'CREATED'
  | 'VALIDATING'
  | 'CALCULATING'
  | 'READY'
  | 'AUTHORIZED'
  | 'SUBMITTING'
  | 'CONFIRMING'
  | 'SETTLED'
  | 'RECONCILED'
  | 'PARTIALLY_SETTLED'
  | 'FAILED'
  | 'REQUIRES_RECONCILIATION'
  | 'CANCELLED';

export interface SettlementRecipient {
  rank: number;
  playerWallet: string;
  allocationBps: number;
  amount: number;
  amountBaseUnits: number;
  isResidualRecipient: boolean;
  txHash?: string;
  ledger?: number;
  status: 'PENDING' | 'SUBMITTED' | 'CONFIRMED' | 'FAILED';
  confirmedAt?: number;
  failureReason?: string;
}

export interface SettlementSnapshot {
  settlementId: string;
  tournamentId: string;
  agreementId: string;
  agreementVersion: number;
  agreementHash: string;
  rankingId: string;
  rankingVersion: number;
  rankingHash: string;
  prizePoolAmount: number;
  prizeAsset: string;
  assetIssuer?: string;
  allocationRules: AllocationRule[];
  roundingRule: string;
  residualRule: string;
  tieRule: string;
  recipients: SettlementRecipient[];
  grossPrizePool: number;
  totalAllocated: number;
  residualAmount: number;
  createdAt: number;
}

export interface SettlementRecord {
  settlementId: string;
  tournamentId: string;
  agreementId: string;
  agreementVersion: number;
  agreementHash: string;
  rankingVersion: number;
  rankingHash: string;
  prizePoolAmount: number;
  prizeAsset: string;
  settlementHash: string;
  status: SettlementStatus;
  recipients: SettlementRecipient[];
  grossPrizePool: number;
  totalAllocated: number;
  residualAmount: number;
  snapshot: SettlementSnapshot;
  authorizedBy?: string;
  authorizedAt?: number;
  executedAt?: number;
  completedAt?: number;
  reconciledAt?: number;
  stellarTxHash?: string;
  stellarLedger?: number;
  explorerUrl?: string;
  failureReason?: string;
  createdAt: number;
  updatedAt: number;
}

export interface SettlementEligibilityResult {
  eligible: boolean;
  tournamentId: string;
  reasons: string[];
  agreement?: PrizeAgreement;
  ranking?: FinalRankingRecord;
  prizePoolFunding?: PrizePoolFunding;
}

export interface SettlementTransactionRecord {
  id: string;
  settlementId: string;
  tournamentId: string;
  recipientRank: number;
  recipientWallet: string;
  asset: string;
  amount: number;
  amountBaseUnits: number;
  expectedAmount: number;
  actualAmount: number;
  txHash: string;
  ledger?: number;
  status: 'PENDING' | 'SUBMITTED' | 'CONFIRMED' | 'FAILED' | 'RECONCILIATION_REQUIRED';
  submittedAt: number;
  confirmedAt?: number;
  failureCode?: string;
  failureReason?: string;
  explorerUrl: string;
}

export interface SettlementReconciliationRecord {
  reconciliationId: string;
  settlementId: string;
  tournamentId: string;
  expectedTotal: number;
  observedTotal: number;
  expectedRecipientCount: number;
  observedRecipientCount: number;
  matchedTransactions: number;
  mismatchedTransactions: number;
  status: 'RECONCILED' | 'MISMATCH' | 'REQUIRES_REVIEW' | 'PENDING';
  details: string;
  checkedAt: number;
  discrepancies: string[];
}
