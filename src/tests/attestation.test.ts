import { describe, it, expect } from 'vitest';
import { AttestationService } from '../services/attestation.service';
import { ResultVerification } from '../types';

describe('AttestationService with Ed25519 Cryptographic Signatures', () => {
  const sampleVerification: ResultVerification = {
    matchId: 'match-101',
    tournamentId: 'tourn-1',
    playerWallet: 'GCQ3OLBMJUGWN3PHYE3SDIKKIPVLJSFFWG4Q4CEABGHWGBEBPBKMY6OW',
    submittedScore: 1250,
    replayedScore: 1250,
    accuracy: 94.5,
    eventCount: 45,
    resultHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    verificationVersion: '1.0.0',
    verifier: 'Stellar Splash Engine v1',
    verifiedAt: Date.now(),
    status: 'VERIFIED',
  };

  it('generates an attestation with a valid Ed25519 signature', () => {
    const attestation = AttestationService.createAttestation(sampleVerification);

    expect(attestation.attestationId).toMatch(/^attest-/);
    expect(attestation.signature).toBeDefined();
    expect(attestation.signature?.length).toBeGreaterThan(64);
    expect(attestation.signerPublicKey).toBeDefined();
    expect(attestation.signerPublicKey?.startsWith('G')).toBe(true);

    const isValid = AttestationService.verifyAttestation(attestation, sampleVerification);
    expect(isValid).toBe(true);
  });

  it('rejects tampered verification score', () => {
    const attestation = AttestationService.createAttestation(sampleVerification);

    const tamperedVerification: ResultVerification = {
      ...sampleVerification,
      replayedScore: 9999, // tampered score
    };

    const isValid = AttestationService.verifyAttestation(attestation, tamperedVerification);
    expect(isValid).toBe(false);
  });

  it('rejects forged attestation signature', () => {
    const attestation = AttestationService.createAttestation(sampleVerification);

    const forgedAttestation = {
      ...attestation,
      signature: attestation.signature?.replace(/[a-f0-9]/, '0'), // corrupt signature
    };

    const isValid = AttestationService.verifyAttestation(forgedAttestation, sampleVerification);
    expect(isValid).toBe(false);
  });
});
