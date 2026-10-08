import crypto from 'crypto';
import { GameEvent, GameResult, MatchSession, PrizeAgreement, RankingEntry } from '../types';

export class CanonicalService {
  /**
   * Universal recursive canonical JSON serializer ensuring sorted object keys at all nesting levels.
   */
  public static canonicalSerialize(obj: any): string {
    if (obj === null || typeof obj !== 'object') {
      return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
      return '[' + obj.map((x) => this.canonicalSerialize(x)).join(',') + ']';
    }
    const keys = Object.keys(obj).sort();
    return '{' + keys.map((k) => JSON.stringify(k) + ':' + this.canonicalSerialize(obj[k])).join(',') + '}';
  }

  /**
   * Helper to compute SHA-256 hex digest of string input.
   */
  public static sha256Hex(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Deterministically normalizes game events by sequence number.
   */
  public static normalizeEvents(events: GameEvent[]): GameEvent[] {
    return [...events]
      .sort((a, b) => a.seq - b.seq)
      .map((e) => ({
        seq: Math.floor(e.seq),
        timestamp: Math.floor(e.timestamp),
        type: e.type,
        points: Math.floor(e.points),
        combo: Math.floor(e.combo),
        multiplier: Math.floor(e.multiplier),
      }));
  }

  /**
   * Generates a deterministic canonical JSON string for a match result.
   */
  public static canonicalizeResult(
    session: MatchSession,
    result: Pick<
      GameResult,
      | 'baseScore'
      | 'comboBonus'
      | 'multiplierBonus'
      | 'penalties'
      | 'finalScore'
      | 'accuracy'
      | 'maxCombo'
      | 'endTime'
    >,
    normalizedEvents: GameEvent[]
  ): string {
    const canonicalObject = {
      matchId: session.matchId,
      tournamentId: session.tournamentId,
      playerWallet: session.playerWallet,
      gameId: session.gameId,
      gameVersion: session.gameVersion,
      startTime: Math.floor(session.startTime),
      endTime: Math.floor(result.endTime),
      durationMs: Math.floor(result.endTime - session.startTime),
      eventsCount: normalizedEvents.length,
      baseScore: Math.floor(result.baseScore),
      comboBonus: Math.floor(result.comboBonus),
      multiplierBonus: Math.floor(result.multiplierBonus),
      penalties: Math.floor(result.penalties),
      finalScore: Math.floor(result.finalScore),
      accuracy: Math.floor(result.accuracy),
      maxCombo: Math.floor(result.maxCombo),
      events: normalizedEvents,
    };

    return JSON.stringify(canonicalObject, Object.keys(canonicalObject).sort());
  }

  /**
   * Generates deterministic SHA-256 hash over canonical match result.
   */
  public static computeResultHash(canonicalJson: string): string {
    return crypto.createHash('sha256').update(canonicalJson).digest('hex');
  }

  /**
   * Generates a canonical SHA-256 hash for a tournament prize agreement.
   */
  public static computeAgreementHash(agreement: Omit<PrizeAgreement, 'agreementHash' | 'status' | 'approvedBy' | 'approvedAt' | 'approvalSignature' | 'lockedAt'>): string {
    const canonicalObject = {
      agreementId: agreement.agreementId,
      tournamentId: agreement.tournamentId,
      version: Math.floor(agreement.version),
      prizeAsset: agreement.prizeAsset,
      prizePoolAmount: Math.floor(agreement.prizePoolAmount),
      rankingMethod: agreement.rankingMethod,
      allocationRules: agreement.allocationRules
        .map((r) => ({
          rank: Math.floor(r.rank),
          basisPoints: Math.floor(r.basisPoints),
          label: r.label,
        }))
        .sort((a, b) => a.rank - b.rank),
      tieRule: agreement.tieRule,
      roundingRule: agreement.roundingRule,
      residualRule: agreement.residualRule,
      createdBy: agreement.createdBy,
      createdAt: Math.floor(agreement.createdAt),
    };

    const canonicalJson = JSON.stringify(canonicalObject, Object.keys(canonicalObject).sort());
    return crypto.createHash('sha256').update(canonicalJson).digest('hex');
  }

  /**
   * Generates a canonical SHA-256 hash for a finalized tournament ranking.
   */
  public static computeRankingHash(tournamentId: string, version: number, entries: RankingEntry[]): string {
    const canonicalObject = {
      tournamentId,
      rankingVersion: Math.floor(version),
      entries: entries.map((e) => ({
        rank: Math.floor(e.rank),
        playerWallet: e.playerWallet,
        score: Math.floor(e.score),
        accuracy: Math.floor(e.accuracy),
        completedAt: Math.floor(e.completedAt),
        matchId: e.matchId,
        resultHash: e.resultHash,
      })),
    };

    const canonicalJson = JSON.stringify(canonicalObject, Object.keys(canonicalObject).sort());
    return crypto.createHash('sha256').update(canonicalJson).digest('hex');
  }
}
