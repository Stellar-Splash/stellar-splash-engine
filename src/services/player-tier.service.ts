export type PlayerTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';

export interface PlayerCareerStatsInput {
  tournamentsJoined: number;
  tournamentsWon: number;
  totalScore: number;
}

export interface PlayerTierEvaluation {
  tier: PlayerTier;
  tierPoints: number;
  winRatePct: number;
  nextTier: PlayerTier | null;
  progressToNextPct: number;
}

/**
 * Service evaluating player competitive tiers based on career tournament accomplishments.
 */
export class PlayerTierService {
  /**
   * Evaluates player career tier and progress.
   */
  public static evaluateTier(stats: PlayerCareerStatsInput): PlayerTierEvaluation {
    const joined = Math.max(0, stats.tournamentsJoined);
    const won = Math.max(0, stats.tournamentsWon);
    const score = Math.max(0, stats.totalScore);

    const winRatePct = joined > 0 ? (won / joined) * 100 : 0;

    // Calculate composite tier score points:
    // (wins * 500) + (score * 0.01) + (joined * 50)
    const tierPoints = Math.round(won * 500 + score * 0.01 + joined * 50);

    let tier: PlayerTier = 'BRONZE';
    let nextTier: PlayerTier | null = 'SILVER';
    let minPoints = 0;
    let nextTierPoints = 250;

    if (won >= 10 && winRatePct >= 40) {
      tier = 'DIAMOND';
      nextTier = null;
      minPoints = 5000;
      nextTierPoints = 5000;
    } else if (won >= 5 && winRatePct >= 25) {
      tier = 'PLATINUM';
      nextTier = 'DIAMOND';
      minPoints = 2500;
      nextTierPoints = 5000;
    } else if (won >= 2 || score >= 50000) {
      tier = 'GOLD';
      nextTier = 'PLATINUM';
      minPoints = 1000;
      nextTierPoints = 2500;
    } else if (won >= 1 || joined >= 3) {
      tier = 'SILVER';
      nextTier = 'GOLD';
      minPoints = 250;
      nextTierPoints = 1000;
    }

    let progressToNextPct = 100;
    if (nextTier) {
      const span = nextTierPoints - minPoints;
      const progress = Math.max(0, tierPoints - minPoints);
      progressToNextPct = Math.min(100, Math.round((progress / span) * 100));
    }

    return {
      tier,
      tierPoints,
      winRatePct: parseFloat(winRatePct.toFixed(1)),
      nextTier,
      progressToNextPct,
    };
  }
}
