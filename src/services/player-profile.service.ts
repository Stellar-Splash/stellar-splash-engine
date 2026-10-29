export interface PlayerMatchRecord {
  tournamentId: string;
  score: number;
  rank: number;
  prizeWon: number;
  completedAt: number;
}

export interface PlayerProfileSummary {
  playerWallet: string;
  matchesPlayed: number;
  wins: number;
  totalScore: number;
  totalPrizesEarned: number;
  highestRank: number;
  winRatePercent: number;
  firstActiveAt: number;
  lastActiveAt: number;
}

/**
 * Service aggregating player career statistics, tournament placements,
 * and escrow payout earnings.
 */
export class PlayerProfileService {
  private static matchHistory: Map<string, PlayerMatchRecord[]> = new Map();

  /**
   * Resets internal store (used in unit testing).
   */
  public static reset(): void {
    this.matchHistory.clear();
  }

  /**
   * Records a completed tournament match for a player wallet.
   */
  public static recordMatchResult(
    playerWallet: string,
    tournamentId: string,
    score: number,
    rank: number,
    prizeWon: number = 0,
    completedAt: number = Date.now()
  ): PlayerMatchRecord {
    const record: PlayerMatchRecord = {
      tournamentId,
      score,
      rank,
      prizeWon,
      completedAt,
    };

    if (!this.matchHistory.has(playerWallet)) {
      this.matchHistory.set(playerWallet, []);
    }

    this.matchHistory.get(playerWallet)!.push(record);
    return record;
  }

  /**
   * Computes career summary profile for a player wallet.
   */
  public static getProfile(playerWallet: string): PlayerProfileSummary {
    const history = this.matchHistory.get(playerWallet) || [];
    const matchesPlayed = history.length;

    if (matchesPlayed === 0) {
      return {
        playerWallet,
        matchesPlayed: 0,
        wins: 0,
        totalScore: 0,
        totalPrizesEarned: 0,
        highestRank: 0,
        winRatePercent: 0,
        firstActiveAt: 0,
        lastActiveAt: 0,
      };
    }

    let wins = 0;
    let totalScore = 0;
    let totalPrizesEarned = 0;
    let highestRank = Infinity;
    let firstActiveAt = Infinity;
    let lastActiveAt = 0;

    for (const m of history) {
      if (m.rank === 1) wins++;
      totalScore += m.score;
      totalPrizesEarned += m.prizeWon;
      if (m.rank < highestRank) highestRank = m.rank;
      if (m.completedAt < firstActiveAt) firstActiveAt = m.completedAt;
      if (m.completedAt > lastActiveAt) lastActiveAt = m.completedAt;
    }

    const winRatePercent = Math.round((wins / matchesPlayed) * 100);

    return {
      playerWallet,
      matchesPlayed,
      wins,
      totalScore,
      totalPrizesEarned,
      highestRank: highestRank === Infinity ? 0 : highestRank,
      winRatePercent,
      firstActiveAt,
      lastActiveAt,
    };
  }

  /**
   * Retrieves match history records for a player, sorted newest first.
   */
  public static getMatchHistory(playerWallet: string, limit: number = 20): PlayerMatchRecord[] {
    const history = this.matchHistory.get(playerWallet) || [];
    return [...history]
      .sort((a, b) => b.completedAt - a.completedAt)
      .slice(0, limit);
  }
}
