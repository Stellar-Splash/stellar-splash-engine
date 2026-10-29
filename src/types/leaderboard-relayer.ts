export interface LeaderboardEntry {
  rank: number;
  playerWallet: string;
  score: number;
  matchesPlayed: number;
  winRateBps: number;
  lastActiveTimestamp: number;
}

export interface RankDeltaNotification {
  type: 'RANK_UPDATE';
  tournamentId: number;
  playerWallet: string;
  previousRank: number;
  newRank: number;
  scoreDelta: number;
  newScore: number;
  timestamp: number;
}

export interface LiveLeaderboardSnapshot {
  tournamentId: number;
  updatedAt: number;
  totalParticipants: number;
  topRanked: LeaderboardEntry[];
}
