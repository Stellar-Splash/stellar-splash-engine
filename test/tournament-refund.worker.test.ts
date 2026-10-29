import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TournamentRefundWorker } from '../src/services/tournament-refund.worker';
import { StoreService } from '../src/services/store.service';
import { EventBusService } from '../src/services/event-bus.service';
import { Tournament } from '../src/types';

describe('TournamentRefundWorker', () => {
  const makeTournament = (
    id: string,
    state: Tournament['state'],
    participants: number,
    prize: number,
  ): Tournament => ({
    id,
    name: `Tournament ${id}`,
    description: 'Refund worker test',
    gameId: 'splash-rush',
    gameVersion: '1.0.0',
    creatorWallet: 'GA2C5RFPE6GCKMY3US5PAB6UZLKIGAHWKXX2GAKVOOUMVQHGASVMOROB',
    prizeAsset: 'XLM',
    prizePoolAmount: prize,
    maxParticipants: 16,
    currentParticipants: participants,
    startTime: Date.now() - 3600_000,
    endTime: Date.now() - 1000,
    state,
    createdAt: Date.now() - 3600_000,
    updatedAt: Date.now() - 1000,
  });

  beforeEach(() => {
    StoreService.reset();
    TournamentRefundWorker.reset();
  });

  afterEach(() => {
    TournamentRefundWorker.stop();
  });

  it('processes refund for cancelled tournament with escrow balance', () => {
    const cancelled = makeTournament('tourn-cancelled', 'CANCELLED', 2, 750);
    StoreService.saveTournament(cancelled);

    const broadcastSpy = vi.spyOn(EventBusService, 'broadcast');

    const refunds = TournamentRefundWorker.processPendingRefunds();
    expect(refunds).toHaveLength(1);
    expect(refunds[0].tournamentId).toBe('tourn-cancelled');
    expect(refunds[0].refundAmount).toBe(750);
    expect(refunds[0].reason).toBe('TOURNAMENT_CANCELLED');

    expect(broadcastSpy).toHaveBeenCalledWith(
      'TOURNAMENT_FINALIZED',
      expect.objectContaining({
        action: 'REFUND_DISPATCHED',
        refundAmount: 750,
      }),
    );

    // Second pass should not duplicate refund
    const secondPass = TournamentRefundWorker.processPendingRefunds();
    expect(secondPass).toHaveLength(0);
  });

  it('processes refund for finalized tournament with zero participants', () => {
    const uncontested = makeTournament('tourn-empty', 'FINALIZED', 0, 500);
    StoreService.saveTournament(uncontested);

    const refunds = TournamentRefundWorker.processPendingRefunds();
    expect(refunds).toHaveLength(1);
    expect(refunds[0].tournamentId).toBe('tourn-empty');
    expect(refunds[0].reason).toBe('ZERO_PARTICIPANTS_UNCONTESTED');
  });

  it('ignores active or contested finalized tournaments', () => {
    const active = makeTournament('tourn-active', 'OPEN', 5, 500);
    const contested = makeTournament('tourn-contested', 'FINALIZED', 8, 1000);
    StoreService.saveTournament(active);
    StoreService.saveTournament(contested);

    const refunds = TournamentRefundWorker.processPendingRefunds();
    expect(refunds).toHaveLength(0);
  });
});
