import { createHash } from 'crypto';

export type AttestationLifecycleStatus = 'PENDING' | 'ATTESTED' | 'DISPUTED' | 'SETTLED';

export interface MatchAttestation {
  attestationId: string;
  matchId: string;
  tournamentId: string;
  playerWallet: string;
  score: number;
  resultHash: string;
  attestationDigest: string;
  status: AttestationLifecycleStatus;
  txHash?: string;
  ledger?: number;
  disputeReason?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Service managing cryptographic match attestations and on-chain lifecycle transitions.
 */
export class MatchAttestationService {
  private static attestations: Map<string, MatchAttestation> = new Map();

  /**
   * Resets internal store (used in unit testing).
   */
  public static reset(): void {
    this.attestations.clear();
  }

  /**
   * Computes deterministic SHA-256 digest for an attestation.
   */
  public static computeDigest(
    matchId: string,
    tournamentId: string,
    playerWallet: string,
    score: number,
    resultHash: string
  ): string {
    const payload = `${matchId}:${tournamentId}:${playerWallet}:${score}:${resultHash}`;
    return createHash('sha256').update(payload).digest('hex');
  }

  /**
   * Creates a new pending attestation record.
   */
  public static createAttestation(
    matchId: string,
    tournamentId: string,
    playerWallet: string,
    score: number,
    resultHash: string,
    createdAt: number = Date.now()
  ): MatchAttestation {
    const attestationDigest = this.computeDigest(matchId, tournamentId, playerWallet, score, resultHash);
    const attestationId = `attest-${attestationDigest.slice(0, 16)}`;

    const attestation: MatchAttestation = {
      attestationId,
      matchId,
      tournamentId,
      playerWallet,
      score,
      resultHash,
      attestationDigest,
      status: 'PENDING',
      createdAt,
      updatedAt: createdAt,
    };

    this.attestations.set(attestationId, attestation);
    return attestation;
  }

  /**
   * Updates attestation state to ATTESTED with on-chain Soroban transaction details.
   */
  public static markAttested(
    attestationId: string,
    txHash: string,
    ledger: number,
    updatedAt: number = Date.now()
  ): MatchAttestation | null {
    const record = this.attestations.get(attestationId);
    if (!record) return null;

    record.status = 'ATTESTED';
    record.txHash = txHash;
    record.ledger = ledger;
    record.updatedAt = updatedAt;

    this.attestations.set(attestationId, record);
    return record;
  }

  /**
   * Updates attestation state to DISPUTED when a challenge is filed.
   */
  public static markDisputed(
    attestationId: string,
    disputeReason: string,
    updatedAt: number = Date.now()
  ): MatchAttestation | null {
    const record = this.attestations.get(attestationId);
    if (!record) return null;

    record.status = 'DISPUTED';
    record.disputeReason = disputeReason;
    record.updatedAt = updatedAt;

    this.attestations.set(attestationId, record);
    return record;
  }

  /**
   * Updates attestation state to SETTLED upon tournament payout finalization.
   */
  public static markSettled(attestationId: string, updatedAt: number = Date.now()): MatchAttestation | null {
    const record = this.attestations.get(attestationId);
    if (!record) return null;

    record.status = 'SETTLED';
    record.updatedAt = updatedAt;

    this.attestations.set(attestationId, record);
    return record;
  }

  /**
   * Retrieves an attestation by ID.
   */
  public static getAttestation(attestationId: string): MatchAttestation | null {
    return this.attestations.get(attestationId) || null;
  }

  /**
   * Retrieves all attestations for a tournament.
   */
  public static getAttestationsForTournament(tournamentId: string): MatchAttestation[] {
    return Array.from(this.attestations.values()).filter((a) => a.tournamentId === tournamentId);
  }
}
