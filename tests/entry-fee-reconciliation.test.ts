import { describe, it, expect, beforeEach } from 'vitest';
import { EntryFeeReconciliationService } from '../src/services/entry-fee-reconciliation.service';

describe('EntryFeeReconciliationService', () => {
  beforeEach(() => {
    EntryFeeReconciliationService.reset();
  });

  it('records entry fee payments and checks status', () => {
    const payment = EntryFeeReconciliationService.recordPayment(
      'tourney-1',
      'GBBD...1',
      5_000_0000000n,
      'tx_hash_1'
    );

    expect(payment.tournamentId).toBe('tourney-1');
    expect(payment.playerAddress).toBe('GBBD...1');
    expect(payment.amount).toBe(5_000_0000000n);

    expect(EntryFeeReconciliationService.hasPlayerPaid('tourney-1', 'GBBD...1')).toBe(true);
    expect(EntryFeeReconciliationService.hasPlayerPaid('tourney-1', 'GBBD...2')).toBe(false);
  });

  it('reconciles balanced tournaments accurately', () => {
    EntryFeeReconciliationService.recordPayment('tourney-2', 'GBBD...1', 10_000_0000000n, 'tx_1');
    EntryFeeReconciliationService.recordPayment('tourney-2', 'GBBD...2', 10_000_0000000n, 'tx_2');

    const report = EntryFeeReconciliationService.getReconciliationSummary(
      'tourney-2',
      10_000_0000000n,
      2
    );

    expect(report.isBalanced).toBe(true);
    expect(report.totalCollected).toBe(20_000_0000000n);
    expect(report.expectedTotal).toBe(20_000_0000000n);
    expect(report.difference).toBe(0n);
    expect(report.collectedCount).toBe(2);
  });

  it('detects underfunded or overfunded states', () => {
    EntryFeeReconciliationService.recordPayment('tourney-3', 'GBBD...1', 5_000_0000000n, 'tx_1');

    const report = EntryFeeReconciliationService.getReconciliationSummary(
      'tourney-3',
      5_000_0000000n,
      2
    );

    expect(report.isBalanced).toBe(false);
    expect(report.collectedCount).toBe(1);
    expect(report.totalCollected).toBe(5_000_0000000n);
    expect(report.expectedTotal).toBe(10_000_0000000n);
    expect(report.difference).toBe(-5_000_0000000n);
  });

  it('clears tournament payments when requested', () => {
    EntryFeeReconciliationService.recordPayment('tourney-4', 'GBBD...1', 5_000_0000000n, 'tx_1');
    expect(EntryFeeReconciliationService.getPayments('tourney-4').length).toBe(1);

    EntryFeeReconciliationService.clearTournament('tourney-4');
    expect(EntryFeeReconciliationService.getPayments('tourney-4').length).toBe(0);
  });
});
