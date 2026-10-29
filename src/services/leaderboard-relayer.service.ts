import { LeaderboardEntry, LiveLeaderboardSnapshot, RankDeltaNotification } from '../types/leaderboard-relayer';

export class LeaderboardRelayerService {
  private tournamentLeaderboards: Map<number, LeaderboardEntry[]> = new Map();
  private subscribers: ((delta: RankDeltaNotification) => void)[] = [];

  public updatePlayerScore(
    tournamentId: number,
    playerWallet: string,
    score: number,
    winRateBps: number = 0
  ): RankDeltaNotification | null {
    let board = this.tournamentLeaderboards.get(tournamentId) || [];
    const prevIndex = board.findIndex((e) => e.playerWallet === playerWallet);
    const previousRank = prevIndex !== -1 ? board[prevIndex].rank : board.length + 1;
    const previousScore = prevIndex !== -1 ? board[prevIndex].score : 0;
    const matchesPlayed = prevIndex !== -1 ? board[prevIndex].matchesPlayed + 1 : 1;

    // Filter out existing entry to re-sort
    board = board.filter((e) => e.playerWallet !== playerWallet);
    board.push({
      rank: 0,
      playerWallet,
      score,
      matchesPlayed,
      winRateBps,
      lastActiveTimestamp: Date.now(),
    });

    // Sort descending by score
    board.sort((a, b) => b.score - a.score);
    board.forEach((entry, idx) => {
      entry.rank = idx + 1;
    });

    this.tournamentLeaderboards.set(tournamentId, board);

    const newIndex = board.findIndex((e) => e.playerWallet === playerWallet);
    const newRank = newIndex + 1;

    const notification: RankDeltaNotification = {
      type: 'RANK_UPDATE',
      tournamentId,
      playerWallet,
      previousRank,
      newRank,
      scoreDelta: score - previousScore,
      newScore: score,
      timestamp: Date.now(),
    };

    // Broadcast to live listeners
    for (const sub of this.subscribers) {
      try {
        sub(notification);
      } catch {
        // Ignore subscriber delivery failure
      }
    }

    return notification;
  }

  public getSnapshot(tournamentId: number, limit: number = 20): LiveLeaderboardSnapshot {
    const board = this.tournamentLeaderboards.get(tournamentId) || [];
    return {
      tournamentId,
      updatedAt: Date.now(),
      totalParticipants: board.length,
      topRanked: board.slice(0, limit),
    };
  }

  public subscribe(listener: (delta: RankDeltaNotification) => void): () => void {
    this.subscribers.push(listener);
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== listener);
    };
  }

  public clear(): void {
    this.tournamentLeaderboards.clear();
    this.subscribers = [];
  }
}

export const leaderboardRelayer = new LeaderboardRelayerService();
