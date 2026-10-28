import crypto from 'crypto';
import { GameEvent, GameResult, MatchSession } from '../types';

export interface ScoreBreakdown {
  baseScore: number;
  comboBonus: number;
  multiplierBonus: number;
  penalties: number;
  finalScore: number;
  accuracy: number;
  maxCombo: number;
}

export class ScoringService {
  /**
   * Deterministically calculates game score from raw event log.
   * All calculations use integer arithmetic.
   */
  public static calculateScore(events: GameEvent[]): ScoreBreakdown {
    let baseScore = 0;
    let comboBonus = 0;
    let multiplierBonus = 0;
    let penalties = 0;
    let maxCombo = 0;
    let targetHits = 0;
    let totalTargetAttempts = 0;

    // Sort events by sequence number to ensure deterministic processing
    const sortedEvents = [...events].sort((a, b) => a.seq - b.seq);

    for (const evt of sortedEvents) {
      if (evt.combo > maxCombo) {
        maxCombo = Math.floor(evt.combo);
      }

      switch (evt.type) {
        case 'TARGET_HIT': {
          totalTargetAttempts += 1;
          targetHits += 1;
          const points = Math.max(0, Math.floor(evt.points));
          baseScore += points;

          // Integer combo bonus: combo * 5 points
          const currentCombo = Math.max(0, Math.floor(evt.combo));
          if (currentCombo > 1) {
            comboBonus += currentCombo * 5;
          }

          // Integer multiplier bonus: (multiplier - 1) * points
          const mult = Math.max(1, Math.floor(evt.multiplier));
          if (mult > 1) {
            multiplierBonus += (mult - 1) * points;
          }
          break;
        }

        case 'HAZARD_HIT': {
          totalTargetAttempts += 1;
          // Fixed integer penalty: 50 points
          const penaltyAmount = Math.max(0, Math.floor(evt.points || 50));
          penalties += penaltyAmount;
          break;
        }

        case 'COMBO_STREAK': {
          const streakPoints = Math.max(0, Math.floor(evt.points || 20));
          comboBonus += streakPoints;
          break;
        }

        case 'MULTIPLIER_UP': {
          const multVal = Math.max(1, Math.floor(evt.multiplier || 2));
          multiplierBonus += multVal * 10;
          break;
        }

        default:
          break;
      }
    }

    const rawTotal = baseScore + comboBonus + multiplierBonus - penalties;
    const finalScore = Math.max(0, Math.floor(rawTotal));

    // Integer accuracy percentage (0 - 100)
    const accuracy =
      totalTargetAttempts > 0
        ? Math.min(100, Math.floor((targetHits * 100) / totalTargetAttempts))
        : 0;

    return {
      baseScore,
      comboBonus,
      multiplierBonus,
      penalties,
      finalScore,
      accuracy,
      maxCombo,
    };
  }

  /**
   * Generates a deterministic SHA-256 hash for a completed match result.
   */
  public static computeResultHash(
    session: MatchSession,
    breakdown: ScoreBreakdown,
    endTime: number,
    eventsCount: number
  ): string {
    const canonicalPayload = JSON.stringify({
      matchId: session.matchId,
      tournamentId: session.tournamentId,
      playerWallet: session.playerWallet,
      gameId: session.gameId,
      gameVersion: session.gameVersion,
      startTime: session.startTime,
      endTime,
      eventsCount,
      baseScore: breakdown.baseScore,
      comboBonus: breakdown.comboBonus,
      multiplierBonus: breakdown.multiplierBonus,
      penalties: breakdown.penalties,
      finalScore: breakdown.finalScore,
      accuracy: breakdown.accuracy,
      maxCombo: breakdown.maxCombo,
    });

    return crypto.createHash('sha256').update(canonicalPayload).digest('hex');
  }

  /**
   * Validates and constructs the finalized GameResult.
   */
  public static buildGameResult(
    session: MatchSession,
    events: GameEvent[],
    endTime: number
  ): GameResult {
    const breakdown = this.calculateScore(events);
    const resultHash = this.computeResultHash(session, breakdown, endTime, events.length);

    return {
      matchId: session.matchId,
      tournamentId: session.tournamentId,
      playerWallet: session.playerWallet,
      gameVersion: session.gameVersion,
      startTime: session.startTime,
      endTime,
      durationMs: endTime - session.startTime,
      eventsCount: events.length,
      baseScore: breakdown.baseScore,
      comboBonus: breakdown.comboBonus,
      multiplierBonus: breakdown.multiplierBonus,
      penalties: breakdown.penalties,
      finalScore: breakdown.finalScore,
      accuracy: breakdown.accuracy,
      maxCombo: breakdown.maxCombo,
      resultHash,
      submittedAt: Date.now(),
      verified: true,
    };
  }

  /**
   * Financial governance calculation enforcing exact 10,000 basis points distribution
   * with integer floor arithmetic and deterministic residual dust credit to Rank 1.
   */
  public static calculatePrizePoolBpsShares(
    totalPrizeStroops: bigint,
    allocations: Array<{ rank: number; basisPoints: number }>
  ): Array<{ rank: number; basisPoints: number; shareStroops: bigint; isDustRecipient: boolean }> {
    const totalBps = allocations.reduce((sum, item) => sum + item.basisPoints, 0);
    if (totalBps !== 10_000) {
      throw new Error(`INVALID_BPS_SUM: Basis points sum (${totalBps}) must equal exactly 10,000 bps.`);
    }

    const sorted = [...allocations].sort((a, b) => a.rank - b.rank);
    let distributed = 0n;
    const initialShares = sorted.map((alloc) => {
      const share = (totalPrizeStroops * BigInt(alloc.basisPoints)) / 10_000n;
      distributed += share;
      return {
        rank: alloc.rank,
        basisPoints: alloc.basisPoints,
        shareStroops: share,
        isDustRecipient: false,
      };
    });

    const dust = totalPrizeStroops - distributed;
    if (dust > 0n && initialShares.length > 0) {
      initialShares[0].shareStroops += dust;
      initialShares[0].isDustRecipient = true;
    }

    return initialShares;
  }
}
