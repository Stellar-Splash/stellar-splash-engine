import { describe, it, expect } from 'vitest';
import { AgreementService } from '../services/agreement.service';
import { StoreService } from '../services/store.service';
import { AllocationRule } from '../types';

describe('Prize Agreement Financial Rules & Invariants', () => {
  const validRules: AllocationRule[] = [
    { rank: 1, basisPoints: 5000, label: '1st Place' }, // 50%
    { rank: 2, basisPoints: 3000, label: '2nd Place' }, // 30%
    { rank: 3, basisPoints: 2000, label: '3rd Place' }, // 20%
  ];

  it('successfully creates an agreement when allocation equals exactly 10,000 basis points', () => {
    const agreement = AgreementService.createAgreement({
      tournamentId: 'tourn-splash-001',
      version: 1,
      prizeAsset: 'USDC',
      prizePoolAmount: 100,
      allocationRules: validRules,
      createdBy: 'GA2C5RFPE6GCKMY3US5PAB6UZLKIGAHWKXX2GAKVOOUMVQHGASVMOROB',
    });

    expect(agreement.agreementHash).toBeDefined();
    expect(agreement.agreementHash.length).toBe(64);
    expect(agreement.status).toBe('PENDING_APPROVAL');
    expect(agreement.version).toBe(1);
  });

  it('strictly rejects agreements where basis points do not sum to 10,000 (over-allocation)', () => {
    const invalidRules: AllocationRule[] = [
      { rank: 1, basisPoints: 6000, label: '1st' },
      { rank: 2, basisPoints: 5000, label: '2nd' }, // 6000 + 5000 = 11000
    ];

    expect(() => {
      AgreementService.createAgreement({
        tournamentId: 'tourn-splash-001',
        version: 2,
        prizeAsset: 'USDC',
        prizePoolAmount: 100,
        allocationRules: invalidRules,
        createdBy: 'GA2C5RFPE6GCKMY3US5PAB6UZLKIGAHWKXX2GAKVOOUMVQHGASVMOROB',
      });
    }).toThrow(/must equal exactly 10,000/);
  });

  it('strictly rejects agreements where basis points are under-allocated', () => {
    const invalidRules: AllocationRule[] = [
      { rank: 1, basisPoints: 5000, label: '1st' },
      { rank: 2, basisPoints: 3000, label: '2nd' }, // 8000 bps
    ];

    expect(() => {
      AgreementService.createAgreement({
        tournamentId: 'tourn-splash-001',
        version: 2,
        prizeAsset: 'USDC',
        prizePoolAmount: 100,
        allocationRules: invalidRules,
        createdBy: 'GA2C5RFPE6GCKMY3US5PAB6UZLKIGAHWKXX2GAKVOOUMVQHGASVMOROB',
      });
    }).toThrow(/must equal exactly 10,000/);
  });

  it('calculates deterministic payouts with remainder dust awarded to Rank 1', () => {
    // 10001 units with 50/30/20:
    // 50% = 5000.5 -> floor = 5000
    // 30% = 3000.3 -> floor = 3000
    // 20% = 2000.2 -> floor = 2000
    // Sum = 10000. Dust = 1 unit.
    // Rank 1 gets 5000 + 1 = 5001.
    const allocations = AgreementService.calculateSettlementAllocations(10001, validRules);

    expect(allocations[0].amount).toBe(5001); // Rank 1 dust recipient
    expect(allocations[1].amount).toBe(3000);
    expect(allocations[2].amount).toBe(2000);

    const totalDistributed = allocations.reduce((acc, curr) => acc + curr.amount, 0);
    expect(totalDistributed).toBe(10001);
  });

  it('generates different agreement hashes when material terms change', () => {
    const ag1 = AgreementService.createAgreement({
      tournamentId: 'tourn-splash-001',
      version: 1,
      prizeAsset: 'USDC',
      prizePoolAmount: 100,
      allocationRules: validRules,
      createdBy: 'GA2C5RFPE6GCKMY3US5PAB6UZLKIGAHWKXX2GAKVOOUMVQHGASVMOROB',
    });

    const ag2 = AgreementService.createAgreement({
      tournamentId: 'tourn-splash-001',
      version: 1,
      prizeAsset: 'USDC',
      prizePoolAmount: 200, // Changed pool amount
      allocationRules: validRules,
      createdBy: 'GA2C5RFPE6GCKMY3US5PAB6UZLKIGAHWKXX2GAKVOOUMVQHGASVMOROB',
    });

    expect(ag1.agreementHash).not.toBe(ag2.agreementHash);
  });

  it('enforces immutability: locked agreements cannot be mutated or overwritten', () => {
    const agreement = AgreementService.createAgreement({
      tournamentId: 'tourn-immutable-test',
      version: 1,
      prizeAsset: 'USDC',
      prizePoolAmount: 50,
      allocationRules: validRules,
      createdBy: 'GA2C5RFPE6GCKMY3US5PAB6UZLKIGAHWKXX2GAKVOOUMVQHGASVMOROB',
    });

    agreement.status = 'LOCKED';
    StoreService.saveAgreement(agreement);

    // Attempting to overwrite locked agreement with different status should fail
    const mutated = { ...agreement, prizePoolAmount: 999 };
    expect(() => {
      StoreService.saveAgreement(mutated);
    }).toThrow(/Locked agreements cannot be modified/);
  });
});
