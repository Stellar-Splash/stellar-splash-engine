import { describe, it, expect, beforeEach } from 'vitest';
import { MatchAttestationService } from '../src/services/match-attestation.service';

describe('MatchAttestationService', () => {
  beforeEach(() => {
    MatchAttestationService.reset();
  });

  it('creates pending attestation with deterministic digest', () => {
    const attest = MatchAttestationService.createAttestation(
      'match-1',
      'tourney-1',
      'GBBD...1',
      1200,
      'hash_123'
    );

    expect(attest.status).toBe('PENDING');
    expect(attest.attestationId).toMatch(/^attest-[0-9a-f]{16}$/);
    expect(attest.attestationDigest).toHaveLength(64);
  });

  it('transitions through ATTESTED, DISPUTED, and SETTLED states', () => {
    const attest = MatchAttestationService.createAttestation(
      'match-2',
      'tourney-2',
      'GBBD...2',
      950,
      'hash_456'
    );

    const attested = MatchAttestationService.markAttested(attest.attestationId, 'tx_abc', 104523);
    expect(attested?.status).toBe('ATTESTED');
    expect(attested?.txHash).toBe('tx_abc');
    expect(attested?.ledger).toBe(104523);

    const disputed = MatchAttestationService.markDisputed(attest.attestationId, 'Suspicious tick anomaly');
    expect(disputed?.status).toBe('DISPUTED');
    expect(disputed?.disputeReason).toBe('Suspicious tick anomaly');

    const settled = MatchAttestationService.markSettled(attest.attestationId);
    expect(settled?.status).toBe('SETTLED');
  });

  it('retrieves all attestations for a specific tournament', () => {
    MatchAttestationService.createAttestation('m-1', 'tourn-99', 'P1', 100, 'h1');
    MatchAttestationService.createAttestation('m-2', 'tourn-99', 'P2', 200, 'h2');
    MatchAttestationService.createAttestation('m-3', 'other-tourn', 'P3', 300, 'h3');

    const list = MatchAttestationService.getAttestationsForTournament('tourn-99');
    expect(list.length).toBe(2);
  });
});
