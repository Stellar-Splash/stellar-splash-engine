export type TournamentState =
  | 'DRAFT'
  | 'FUNDING'
  | 'OPEN'
  | 'FULL'
  | 'IN_PROGRESS'
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
  prizePoolAmount: number; // e.g. 100
  vaultAddress: string;
  maxParticipants: number;
  currentParticipants: number;
  startTime: number;
  endTime: number;
  state: TournamentState;
  fundingTxHash?: string;
  fundingVerifiedAt?: number;
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

export type GameEventType = 'TARGET_HIT' | 'COMBO_STREAK' | 'HAZARD_HIT' | 'MULTIPLIER_UP';

export interface GameEvent {
  seq: number;
  timestamp: number;
  type: GameEventType;
  points: number;
  combo: number;
  multiplier: number;
  data?: Record<string, unknown>;
}

export interface MatchSession {
  matchId: string;
  tournamentId: string;
  playerWallet: string;
  gameId: string;
  gameVersion: string;
  sessionToken: string;
  startTime: number;
  endTime?: number;
  status: 'STARTED' | 'COMPLETED' | 'EXPIRED' | 'REJECTED';
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
