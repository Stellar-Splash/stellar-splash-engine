import { describe, it, expect, beforeEach } from 'vitest';
import { DisputeResolutionService } from '../src/services/dispute-resolution.service';

describe('DisputeResolutionService', () => {
  beforeEach(() => {
    DisputeResolutionService.reset();
  });

  it('files dispute and tracks active status', () => {
    const dispute = DisputeResolutionService.fileDispute(
      'tourney-1',
      'GBBD...1',
      101,
      'Tick sequence mismatch',
      'hash_evidence_1'
    );

    expect(dispute.status).toBe('ACTIVE');
    expect(dispute.tournamentId).toBe('tourney-1');
    expect(DisputeResolutionService.isTournamentDisputed('tourney-1')).toBe(true);
  });

  it('rejects duplicate active dispute filing on same tournament', () => {
    DisputeResolutionService.fileDispute('tourney-2', 'GBBD...1', 101, 'First dispute');

    expect(() =>
      DisputeResolutionService.fileDispute('tourney-2', 'GBBD...2', 102, 'Second dispute')
    ).toThrowError(/Active dispute already exists/);
  });

  it('resolves dispute and records admin resolution notes', () => {
    DisputeResolutionService.fileDispute('tourney-3', 'GBBD...1', 103, 'Challenge');

    const resolved = DisputeResolutionService.resolveDispute(
      'tourney-3',
      'GA_ADMIN',
      'Confirmed tick manipulation; scores adjusted'
    );

    expect(resolved?.status).toBe('RESOLVED');
    expect(resolved?.resolvedBy).toBe('GA_ADMIN');
    expect(DisputeResolutionService.isTournamentDisputed('tourney-3')).toBe(false);
  });

  it('dismisses unsubstantiated challenges cleanly', () => {
    DisputeResolutionService.fileDispute('tourney-4', 'GBBD...1', 104, 'Spurious challenge');

    const dismissed = DisputeResolutionService.dismissDispute(
      'tourney-4',
      'GA_ADMIN',
      'Replay verified 100% deterministic'
    );

    expect(dismissed?.status).toBe('DISMISSED');
    expect(DisputeResolutionService.isTournamentDisputed('tourney-4')).toBe(false);
  });
});
