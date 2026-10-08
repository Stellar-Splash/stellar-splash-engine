import { FinalRankingRecord, GameResult, RankingEntry, ResultVerification } from '../types';
import { CanonicalService } from './canonical.service';

export class RankingService {
  /**
   * Deterministically calculates ranking entries from verified results.
   * Only verified results are permitted to participate in rankings.
   *
   * Tie-breaker rules:
   * 1. Primary: Score descending
   * 2. Secondary: Accuracy descending
   * 3. Tertiary: Completion timestamp ascending (first to achieve wins)
   */
  public static calculateRankings(
    verifications: ResultVerification[],
    results: GameResult[]
  ): RankingEntry[] {
    // Build set of match IDs that are strictly VERIFIED
    const verifiedMatchIds = new Set(
      verifications.filter((v) => v.status === 'VERIFIED').map((v) => v.matchId)
    );

    // Filter results to only verified matches
    const eligibleResults = results.filter((r) => verifiedMatchIds.has(r.matchId));

    // Group by player wallet to select their best score
    const bestByPlayer = new Map<string, GameResult>();

    for (const r of eligibleResults) {
      const existing = bestByPlayer.get(r.playerWallet);
      if (!existing) {
        bestByPlayer.set(r.playerWallet, r);
      } else {
        if (r.finalScore > existing.finalScore) {
          bestByPlayer.set(r.playerWallet, r);
        } else if (r.finalScore === existing.finalScore) {
          if (r.accuracy > existing.accuracy) {
            bestByPlayer.set(r.playerWallet, r);
          } else if (r.accuracy === existing.accuracy && r.endTime < existing.endTime) {
            bestByPlayer.set(r.playerWallet, r);
          }
        }
      }
    }

    // Sort deterministically
    const sorted = Array.from(bestByPlayer.values()).sort((a, b) => {
      // 1. Primary: Score descending
      if (b.finalScore !== a.finalScore) {
        return b.finalScore - a.finalScore;
      }
      // 2. Secondary: Accuracy descending
      if (b.accuracy !== a.accuracy) {
        return b.accuracy - a.accuracy;
      }
      // 3. Tertiary: Completion timestamp ascending
      return a.endTime - b.endTime;
    });

    return sorted.map((res, index) => ({
      rank: index + 1,
      playerWallet: res.playerWallet,
      score: res.finalScore,
      accuracy: res.accuracy,
      completedAt: res.endTime,
      matchId: res.matchId,
      resultHash: res.resultHash,
    }));
  }

  /**
   * Generates a deterministic ranking hash for the tournament ranking entries.
   */
  public static generateRankingHash(
    tournamentId: string,
    version: number,
    entries: RankingEntry[]
  ): string {
    return CanonicalService.computeRankingHash(tournamentId, version, entries);
  }

  /**
   * Finalizes the tournament ranking and commits to canonical ranking hash.
   */
  public static finalizeTournamentRanking(
    tournamentId: string,
    verifications: ResultVerification[],
    results: GameResult[],
    finalizedBy: string,
    rankingVersion: number = 1
  ): FinalRankingRecord {
    const entries = this.calculateRankings(verifications, results);
    const rankingHash = this.generateRankingHash(tournamentId, rankingVersion, entries);

    return {
      tournamentId,
      rankingVersion,
      entries,
      rankingHash,
      finalizedAt: Date.now(),
      finalizedBy,
    };
  }

  /**
   * Computes the deterministic final ranking from verified results.
   */
  public static computeFinalRankings(
    tournamentId: string,
    verifiedResults: GameResult[],
    rankingVersion: number = 1,
    finalizedBy: string = 'system'
  ): FinalRankingRecord {
    // Create synthetic verifications for already-verified results
    const verifications: ResultVerification[] = verifiedResults
      .filter((r) => r.verified)
      .map((r) => ({
        verificationId: `synth-${r.matchId}`,
        matchId: r.matchId,
        tournamentId: r.tournamentId,
        playerWallet: r.playerWallet,
        gameVersion: r.gameVersion,
        submittedScore: r.finalScore,
        replayedScore: r.finalScore,
        scoreMatch: true,
        resultHash: r.resultHash,
        verificationAlgorithm: 'DETERMINISTIC_REPLAY_ENGINE',
        verificationVersion: '1.0.0',
        verifier: 'verifier.stellar-splash.org',
        verifiedAt: r.submittedAt,
        status: 'VERIFIED',
      }));

    return this.finalizeTournamentRanking(
      tournamentId,
      verifications,
      verifiedResults,
      finalizedBy,
      rankingVersion
    );
  }
}
