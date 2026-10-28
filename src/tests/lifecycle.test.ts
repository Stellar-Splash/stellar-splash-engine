import { describe, it, expect } from 'vitest';
import { LifecycleService, ALLOWED_TRANSITIONS } from '../services/lifecycle.service';
import { Tournament } from '../types';

const createMockTournament = (overrides?: Partial<Tournament>): Tournament => ({
  id: 'tourn-lifecycle-001',
  name: 'Lifecycle Championship',
  description: 'Testing lifecycle state machine',
  gameId: 'splash-rush',
  gameVersion: '1.0.0',
  creatorWallet: 'GBBD67VQMVO455V224GZ622D2J2J45LPOJ24G6V4I6J4S7PGLFOKP7V2',
  prizeAsset: 'XLM',
  prizePoolAmount: 500,
  vaultAddress: 'CACHWJEZY6JN36VFACWRQ7FP4T5EPRRRNBVLOSFHXTJHETZY36JD7QYJ',
  maxParticipants: 16,
  currentParticipants: 8,
  startTime: Date.now() - 3600000,
  endTime: Date.now() + 3600000,
  state: 'DRAFT',
  createdAt: Date.now() - 7200000,
  updatedAt: Date.now() - 7200000,
  ...overrides,
});

describe('LifecycleService State Machine Validator', () => {
  it('correctly maps allowed state transitions', () => {
    expect(LifecycleService.canTransition('DRAFT', 'FUNDING')).toBe(true);
    expect(LifecycleService.canTransition('DRAFT', 'CANCELLED')).toBe(true);
    expect(LifecycleService.canTransition('DRAFT', 'SETTLED')).toBe(false);
    expect(LifecycleService.canTransition('OPEN', 'IN_PROGRESS')).toBe(true);
    expect(LifecycleService.canTransition('COMPLETED', 'OPEN')).toBe(false);
  });

  it('rejects illegal non-adjacent transitions with descriptive AppError', () => {
    const tournament = createMockTournament({ state: 'DRAFT' });

    expect(() => {
      LifecycleService.validateTransition(tournament, 'SETTLED');
    }).toThrowError(/Illegal state transition from 'DRAFT' to 'SETTLED'/);
  });

  it('prohibits state changes from terminal states COMPLETED and CANCELLED', () => {
    const completed = createMockTournament({ state: 'COMPLETED' });
    expect(() => {
      LifecycleService.validateTransition(completed, 'OPEN');
    }).toThrowError(/terminal state 'COMPLETED'/);

    const cancelled = createMockTournament({ state: 'CANCELLED' });
    expect(() => {
      LifecycleService.validateTransition(cancelled, 'DRAFT');
    }).toThrowError(/terminal state 'CANCELLED'/);
  });

  it('enforces verified funding requirement when transitioning to OPEN', () => {
    const unfunded = createMockTournament({
      state: 'FUNDING',
      prizePoolAmount: 0,
      fundingTxHash: undefined,
    });

    expect(() => {
      LifecycleService.validateTransition(unfunded, 'OPEN');
    }).toThrowError(/verified on-chain prize funding/);
  });

  it('enforces ranking hash requirement when transitioning to SETTLING', () => {
    const tournament = createMockTournament({
      state: 'FINALIZED',
      finalRankingHash: undefined,
    });

    expect(() => {
      LifecycleService.validateTransition(tournament, 'SETTLING');
    }).toThrowError(/verified final ranking hash/i);
  });

  it('successfully transitions tournament and mutates updatedAt timestamp', () => {
    const tournament = createMockTournament({ state: 'DRAFT' });
    const initialUpdated = tournament.updatedAt;

    const event = LifecycleService.applyTransition(tournament, 'FUNDING', 'Creator requested funding phase');

    expect(tournament.state).toBe('FUNDING');
    expect(tournament.updatedAt).toBeGreaterThanOrEqual(initialUpdated);
    expect(event.fromState).toBe('DRAFT');
    expect(event.toState).toBe('FUNDING');
  });
});
