import { describe, it, expect } from 'vitest';
// @ts-expect-error cjs script
import { filterContractEvents, WATCH_CONFIG } from '../../scripts/watch-contract-events.cjs';

describe('Contract Event Watcher Filter', () => {
  it('correctly filters recognized contract event topics', () => {
    const rawEvents = [
      { topic: 'player_entered', data: { player: 'GCQ3...' } },
      { topic: 'unknown_event', data: {} },
      { topic: 'tournament_settled', data: { tournamentId: 101 } }
    ];

    const filtered = filterContractEvents(rawEvents);
    expect(filtered.length).toBe(2);
    expect(filtered[0].topic).toBe('player_entered');
    expect(filtered[1].topic).toBe('tournament_settled');
  });

  it('contains expected target contract address', () => {
    expect(WATCH_CONFIG.contractId).toBe('CACHWJEZY6JN36VFACWRQ7FP4T5EPRRRNBVLOSFHXTJHETZY36JD7QYJ');
  });
});
