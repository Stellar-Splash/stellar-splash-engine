import { describe, it, expect } from 'vitest';
import {
  LeaderboardExportService,
  LeaderboardExportRow,
} from '../src/services/leaderboard-export.service';

describe('LeaderboardExportService', () => {
  const mockEntries: LeaderboardExportRow[] = [
    {
      rank: 1,
      playerWallet: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
      score: 1500,
      prizeShareBps: 6000,
      prizeAmount: 60.0,
      asset: 'XLM',
      status: 'SETTLED',
    },
    {
      rank: 2,
      playerWallet: 'GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVWAC',
      score: 1100,
      prizeShareBps: 4000,
      prizeAmount: 40.0,
      asset: 'XLM',
      status: 'SETTLED',
    },
  ];

  it('exports formatted CSV and parses back into structured rows', () => {
    const csv = LeaderboardExportService.exportCsv('tourney-1', mockEntries);

    expect(csv).toContain('Rank,Player Wallet,Score,Prize Share (Bps),Prize Amount,Asset,Status');
    expect(csv).toContain('1,"GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",1500,6000,60.0000,"XLM","SETTLED"');

    const parsed = LeaderboardExportService.parseCsv(csv);
    expect(parsed.length).toBe(2);
    expect(parsed[0].rank).toBe(1);
    expect(parsed[0].score).toBe(1500);
    expect(parsed[0].prizeAmount).toBe(60.0);
  });

  it('exports structured JSON with metadata', () => {
    const jsonStr = LeaderboardExportService.exportJson(
      'tourney-1',
      'Weekend Splash',
      'XLM',
      100,
      mockEntries,
      1700000000
    );

    const parsed = JSON.parse(jsonStr);
    expect(parsed.tournamentId).toBe('tourney-1');
    expect(parsed.title).toBe('Weekend Splash');
    expect(parsed.totalPrizePool).toBe(100);
    expect(parsed.exportedAt).toBe(1700000000);
    expect(parsed.recordCount).toBe(2);
    expect(parsed.rankings[0].playerWallet).toBe('GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5');
  });
});
