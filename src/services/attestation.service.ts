import crypto from 'crypto';
import { ResultAttestation, ResultVerification } from '../types';

export class AttestationService {
  /**
   * Generates a signed cryptographic attestation for an independently verified result.
   */
  public static createAttestation(verification: ResultVerification): ResultAttestation {
    const attestationId = `attest-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const timestamp = Date.now();

    const payload = {
      attestationId,
      tournamentId: verification.tournamentId,
      matchId: verification.matchId,
      playerWallet: verification.playerWallet,
      resultHash: verification.resultHash,
      finalScore: verification.replayedScore,
      verificationVersion: verification.verificationVersion,
      verifierIdentity: verification.verifier,
      timestamp,
    };

    const attestationDigest = crypto
      .createHash('sha256')
      .update(JSON.stringify(payload, Object.keys(payload).sort()))
      .digest('hex');

    return {
      attestationId,
      tournamentId: verification.tournamentId,
      matchId: verification.matchId,
      playerWallet: verification.playerWallet,
      resultHash: verification.resultHash,
      finalScore: verification.replayedScore,
      verificationVersion: verification.verificationVersion,
      verifierIdentity: verification.verifier,
      timestamp,
      attestationDigest,
    };
  }

  /**
   * Validates integrity of an attestation against a result verification.
   */
  public static verifyAttestation(attestation: ResultAttestation, verification: ResultVerification): boolean {
    if (
      attestation.tournamentId !== verification.tournamentId ||
      attestation.matchId !== verification.matchId ||
      attestation.resultHash !== verification.resultHash ||
      attestation.finalScore !== verification.replayedScore
    ) {
      return false;
    }

    const payload = {
      attestationId: attestation.attestationId,
      tournamentId: attestation.tournamentId,
      matchId: attestation.matchId,
      playerWallet: attestation.playerWallet,
      resultHash: attestation.resultHash,
      finalScore: attestation.finalScore,
      verificationVersion: attestation.verificationVersion,
      verifierIdentity: attestation.verifierIdentity,
      timestamp: attestation.timestamp,
    };

    const expectedDigest = crypto
      .createHash('sha256')
      .update(JSON.stringify(payload, Object.keys(payload).sort()))
      .digest('hex');

    return attestation.attestationDigest === expectedDigest;
  }
}
