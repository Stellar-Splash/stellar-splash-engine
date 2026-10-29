import { describe, it, expect, beforeEach } from 'vitest';
import { TournamentCloningService } from '../src/services/tournament-cloning.service';
import { StoreService } from '../src/services/store.service';
import { Tournament } from '../src/types';

describe('TournamentCloningService', () => {
  const creator = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
  const sourceTournament: Tournament = {
    id: 'source-100',
    name: 'Weekly Championship #001',
    description: 'Weekly tournament #001',
    gameId: 'splash-rush',
    gameVersion: '1.0.0',
    creatorWallet: creator,
    prizePoolAmount: 500,
    prizeAsset: 'XLM',
    vaultAddress: 'CACHWJEZY6JN36VFACWRQ7FP4T5EPRRRNBVLOSFHXTJHETZY36JD7QYJ',
    maxParticipants: 32,
    currentParticipants: 10,
    startTime: 1000,
    endTime: 10000,
    state: 'FINALIZED',
    createdAt: 500,
    updatedAt: 10000,
  };

  beforeEach(() => {
    StoreService.saveTournament(sourceTournament);
  });

  it('clones a tournament template successfully with reset state', () => {
    const cloned = TournamentCloningService.cloneTournament({
      sourceTournamentId: 'source-100',
      newTournamentId: 'clone-101',
      title: 'Weekly Championship #002',
      startTime: 20000,
      endTime: 90000,
      creatorWallet: creator,
      prizePoolAmount: 750,
    });

    expect(cloned.id).toBe('clone-101');
    expect(cloned.name).toBe('Weekly Championship #002');
    expect(cloned.state).toBe('CREATED');
    expect(cloned.currentParticipants).toBe(0);
    expect(cloned.prizePoolAmount).toBe(750);
    expect(cloned.maxParticipants).toBe(32);
    expect(cloned.gameId).toBe('splash-rush');
  });

  it('rejects unauthorized cloning by non-creator', () => {
    expect(() =>
      TournamentCloningService.cloneTournament({
        sourceTournamentId: 'source-100',
        newTournamentId: 'clone-102',
        title: 'Unauthorized Clone',
        startTime: 20000,
        endTime: 90000,
        creatorWallet: 'OTHER_WALLET',
      })
    ).toThrowError(/Unauthorized/);
  });

  it('rejects invalid duration timebounds', () => {
    expect(() =>
      TournamentCloningService.cloneTournament({
        sourceTournamentId: 'source-100',
        newTournamentId: 'clone-103',
        title: 'Too Short Event',
        startTime: 20000,
        endTime: 20010, // Only 10s
        creatorWallet: creator,
      })
    ).toThrowError(/Invalid timebounds/);
  });
});
