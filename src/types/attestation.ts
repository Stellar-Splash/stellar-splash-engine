/**
 * Cryptographic Match Attestation & Dispute Type Definitions
 */

export type AttestationStatusType = 'PENDING' | 'ATTESTED' | 'DISPUTED' | 'SETTLED' | 'REJECTED';

export interface AttestationRecord {
  attestationId: string;
  matchId: string;
  tournamentId: string;
  playerWallet: string;
  score: number;
  resultHash: string;
  attestationDigest: string;
  status: AttestationStatusType;
  txHash?: string;
  ledger?: number;
  disputeReason?: string;
  createdAt: number;
  updatedAt: number;
}

export interface AttestationVerificationRequest {
  matchId: string;
  tournamentId: string;
  playerWallet: string;
  submittedScore: number;
  resultHash: string;
}

export interface AttestationVerificationResponse {
  verified: boolean;
  scoreMatch: boolean;
  computedDigest: string;
  attestation?: AttestationRecord;
  error?: string;
}

export interface DisputeFilingPayload {
  tournamentId: string;
  challengerWallet: string;
  reasonCode: number;
  attestationId?: string;
  evidenceHash: string;
  description: string;
  submittedAt: number;
}
