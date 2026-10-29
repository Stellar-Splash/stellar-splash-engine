/**
 * Type definitions for competitive player tiers and audit export reporting.
 */

export type PlayerTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';

export interface PlayerCareerStatsInput {
  tournamentsJoined: number;
  tournamentsWon: number;
  totalScore: number;
}

export interface PlayerTierEvaluation {
  tier: PlayerTier;
  tierPoints: number;
  winRatePct: number;
  nextTier: PlayerTier | null;
  progressToNextPct: number;
}

export interface AuditExportOptions {
  tournamentId: string;
  includeRawPayloads?: boolean;
}
