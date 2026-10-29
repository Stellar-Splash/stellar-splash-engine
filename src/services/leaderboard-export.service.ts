export interface LeaderboardExportRow {
  rank: number;
  playerWallet: string;
  score: number;
  prizeShareBps: number;
  prizeAmount: number;
  asset: string;
  status: string;
}

export interface LeaderboardJsonExport {
  tournamentId: string;
  title: string;
  prizeAsset: string;
  totalPrizePool: number;
  exportedAt: number;
  recordCount: number;
  rankings: LeaderboardExportRow[];
}

/**
 * Service generating standardized CSV and JSON leaderboard reports for
 * organizers, audit trails, and tax/accounting exports.
 */
export class LeaderboardExportService {
  /**
   * Generates formatted CSV string from leaderboard rows.
   */
  public static exportCsv(tournamentId: string, entries: LeaderboardExportRow[]): string {
    const headers = ['Rank', 'Player Wallet', 'Score', 'Prize Share (Bps)', 'Prize Amount', 'Asset', 'Status'];
    const lines = [headers.join(',')];

    for (const e of entries) {
      lines.push(
        [
          e.rank,
          `"${e.playerWallet}"`,
          e.score,
          e.prizeShareBps,
          e.prizeAmount.toFixed(4),
          `"${e.asset}"`,
          `"${e.status}"`,
        ].join(',')
      );
    }

    return lines.join('\n');
  }

  /**
   * Generates formatted JSON string containing full tournament leaderboard and metadata.
   */
  public static exportJson(
    tournamentId: string,
    title: string,
    prizeAsset: string,
    totalPrizePool: number,
    entries: LeaderboardExportRow[],
    exportedAt: number = Date.now()
  ): string {
    const payload: LeaderboardJsonExport = {
      tournamentId,
      title,
      prizeAsset,
      totalPrizePool,
      exportedAt,
      recordCount: entries.length,
      rankings: entries,
    };

    return JSON.stringify(payload, null, 2);
  }

  /**
   * Parses exported CSV back into structured rows.
   */
  public static parseCsv(csv: string): LeaderboardExportRow[] {
    const lines = csv.trim().split('\n');
    if (lines.length <= 1) return [];

    const rows: LeaderboardExportRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map((p) => p.replace(/^"|"$/g, '').trim());
      if (parts.length >= 7) {
        rows.push({
          rank: parseInt(parts[0], 10),
          playerWallet: parts[1],
          score: parseInt(parts[2], 10),
          prizeShareBps: parseInt(parts[3], 10),
          prizeAmount: parseFloat(parts[4]),
          asset: parts[5],
          status: parts[6],
        });
      }
    }

    return rows;
  }
}
