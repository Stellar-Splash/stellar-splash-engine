import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TournamentExpirationWorker } from '../src/services/expiration.worker';
import { StoreService } from '../src/services/store.service';
import { EventBusService } from '../src/services/event-bus.service';
import { Tournament } from '../src/types';

describe('TournamentExpirationWorker', () => {
  const baseTournament = (id: string, endTime: number, state: Tournament['state']): Tournament => ({
    id,
    name: `Tournament ${id}`,
    description: 'Test tournament description',
    gameId: 'splash-rush',
    gameVersion: '1.0.0',
    creatorWallet: 'GA2C5RFPE6GCKMY3US5PAB6UZLKIGAHWKXX2GAKVOOUMVQHGASVMOROB',
    prizeAsset: 'XLM',
    prizePoolAmount: 500,
    maxParticipants: 16,
    currentParticipants: 4,
    startTime: endTime - 3600_000,
    endTime,
    state,
    createdAt: endTime - 3600_000,
    updatedAt: endTime - 3600_000,
  });

  beforeEach(() => {
    StoreService.reset();
    TournamentExpirationWorker.stop();
  });

  afterEach(() => {
    TournamentExpirationWorker.stop();
  });

  it('leaves active tournaments with future end times untouched', () => {
    const now = 1_700_000_000_000;
    const futureTourn = baseTournament('tourn-future', now + 60_000, 'OPEN');
    StoreService.saveTournament(futureTourn);

    const finalized = TournamentExpirationWorker.checkExpiredTournaments(now);
    expect(finalized).toHaveLength(0);

    const reloaded = StoreService.getTournamentById('tourn-future');
    expect(reloaded?.state).toBe('OPEN');
  });

  it('automatically transitions overdue active tournaments to FINALIZED', () => {
    const now = 1_700_000_000_000;
    const expiredOpen = baseTournament('tourn-expired-1', now - 1000, 'OPEN');
    const expiredInProgress = baseTournament('tourn-expired-2', now - 5000, 'IN_PROGRESS');
    const futureOpen = baseTournament('tourn-active-future', now + 100_000, 'OPEN');

    StoreService.saveTournament(expiredOpen);
    StoreService.saveTournament(expiredInProgress);
    StoreService.saveTournament(futureOpen);

    const broadcastSpy = vi.spyOn(EventBusService, 'broadcast');

    const finalized = TournamentExpirationWorker.checkExpiredTournaments(now);
    expect(finalized).toHaveLength(2);
    expect(finalized.map((t) => t.id)).toEqual(
      expect.arrayContaining(['tourn-expired-1', 'tourn-expired-2']),
    );

    // Verify state updated in StoreService
    expect(StoreService.getTournamentById('tourn-expired-1')?.state).toBe('FINALIZED');
    expect(StoreService.getTournamentById('tourn-expired-2')?.state).toBe('FINALIZED');
    expect(StoreService.getTournamentById('tourn-active-future')?.state).toBe('OPEN');

    // Verify broadcast event was dispatched
    expect(broadcastSpy).toHaveBeenCalledWith(
      'TOURNAMENT_FINALIZED',
      expect.objectContaining({
        tournamentId: 'tourn-expired-1',
        reason: 'CUTOFF_TIME_ELAPSED',
      }),
    );
  });

  it('does not re-finalize tournaments that are already SETTLED or CANCELLED', () => {
    const now = 1_700_000_000_000;
    const settled = baseTournament('tourn-settled', now - 10_000, 'SETTLED');
    const cancelled = baseTournament('tourn-cancelled', now - 10_000, 'CANCELLED');

    StoreService.saveTournament(settled);
    StoreService.saveTournament(cancelled);

    const finalized = TournamentExpirationWorker.checkExpiredTournaments(now);
    expect(finalized).toHaveLength(0);

    expect(StoreService.getTournamentById('tourn-settled')?.state).toBe('SETTLED');
    expect(StoreService.getTournamentById('tourn-cancelled')?.state).toBe('CANCELLED');
  });

  it('starts and stops background interval timer cleanly', () => {
    expect(TournamentExpirationWorker.isRunning()).toBe(false);

    TournamentExpirationWorker.start(500);
    expect(TournamentExpirationWorker.isRunning()).toBe(true);

    TournamentExpirationWorker.stop();
    expect(TournamentExpirationWorker.isRunning()).toBe(false);
  });
});
