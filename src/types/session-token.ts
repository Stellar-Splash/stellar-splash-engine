/**
 * Type definitions for match session tokens and replay protection.
 */

export interface SessionToken {
  token: string;
  matchId: string;
  tournamentId: string;
  playerWallet: string;
  issuedAt: number;
  expiresAt: number;
  consumed: boolean;
}

export interface SessionTokenValidationResult {
  valid: boolean;
  reason?: 'NOT_FOUND' | 'CONSUMED' | 'EXPIRED' | 'WALLET_MISMATCH' | 'MATCH_MISMATCH';
  sessionToken?: SessionToken;
}

export interface MatchSubmissionPayload {
  matchId: string;
  tournamentId: string;
  playerWallet: string;
  sessionToken: string;
  finalScore: number;
  eventsCount: number;
  completedAt: number;
}
