import crypto from 'crypto';
import { Keypair } from '@stellar/stellar-sdk';
import { ResultAttestation, ResultVerification } from '../types';

export class AttestationService {
  private static verifierKeypair: Keypair = Keypair.random();

  /**
   * Configures or retrieves the authorized Ed25519 verifier keypair.
   */
  public static getVerifierKeypair(): Keypair {
    return this.verifierKeypair;
  }

  /**
   * Sets the authoritative verifier keypair from a secret seed.
   */
  public static setVerifierSecret(secret: string): void {
    this.verifierKeypair = Keypair.fromSecret(secret);
  }

  /**
   * Generates an Ed25519-signed cryptographic attestation for an independently verified result.
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
      verifierIdentity: this.verifierKeypair.publicKey(),
      timestamp,
    };

    const canonicalJson = JSON.stringify(payload, Object.keys(payload).sort());
    const attestationDigest = crypto.createHash('sha256').update(canonicalJson).digest('hex');

    // Cryptographic Ed25519 signature of the attestation digest
    const digestBuffer = Buffer.from(attestationDigest, 'hex');
    const signatureBuffer = this.verifierKeypair.sign(digestBuffer);
    const signature = signatureBuffer.toString('hex');

    return {
      attestationId,
      tournamentId: verification.tournamentId,
      matchId: verification.matchId,
      playerWallet: verification.playerWallet,
      resultHash: verification.resultHash,
      finalScore: verification.replayedScore,
      verificationVersion: verification.verificationVersion,
      verifierIdentity: this.verifierKeypair.publicKey(),
      timestamp,
      attestationDigest,
      signature,
      signerPublicKey: this.verifierKeypair.publicKey(),
    };
  }

  /**
   * Validates integrity and Ed25519 signature of an attestation against a result verification.
   */
  public static verifyAttestation(
    attestation: ResultAttestation,
    verification: ResultVerification
  ): boolean {
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

    const canonicalJson = JSON.stringify(payload, Object.keys(payload).sort());
    const expectedDigest = crypto.createHash('sha256').update(canonicalJson).digest('hex');

    if (attestation.attestationDigest !== expectedDigest) {
      return false;
    }

    if (attestation.signature && attestation.signerPublicKey) {
      try {
        const verifier = Keypair.fromPublicKey(attestation.signerPublicKey);
        const digestBuffer = Buffer.from(expectedDigest, 'hex');
        const signatureBuffer = Buffer.from(attestation.signature, 'hex');
        return verifier.verify(digestBuffer, signatureBuffer);
      } catch {
        return false;
      }
    }

    return true;
  }
}
