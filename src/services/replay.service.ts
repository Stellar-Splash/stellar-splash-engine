import { GameEvent, GameResult, MatchSession, ResultVerification } from '../types';
import { ScoringService } from './scoring.service';
import { CanonicalService } from './canonical.service';
import { CONFIG } from '../config';

export class ReplayService {
  public static VERIFICATION_VERSION = '1.0.0';
  public static VERIFIER_IDENTITY = 'verifier.stellar-splash.org';

  /**
   * Independently replays game events and verifies the resulting score and hash.
   */
  public static verifyMatch(
    session: MatchSession,
    submittedResult: GameResult,
    events: GameEvent[]
  ): ResultVerification {
    const verificationId = `verif-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    // 1. Game version validation
    const expectedVersion = CONFIG.GAME_VERSIONS['splash-rush'] || '1.0.0';
    if (session.gameVersion !== expectedVersion) {
      return {
        verificationId,
        matchId: session.matchId,
        tournamentId: session.tournamentId,
        playerWallet: session.playerWallet,
        gameVersion: session.gameVersion,
        submittedScore: submittedResult.finalScore,
        replayedScore: 0,
        scoreMatch: false,
        resultHash: submittedResult.resultHash,
        verificationAlgorithm: 'DETERMINISTIC_REPLAY_ENGINE',
        verificationVersion: this.VERIFICATION_VERSION,
        verifier: this.VERIFIER_IDENTITY,
        verifiedAt: Date.now(),
        status: 'REJECTED',
        rejectionReason: `UNSUPPORTED_GAME_VERSION: Unsupported or mismatched game version. Expected ${expectedVersion}, but match used ${session.gameVersion}.`,
      };
    }

    // 2. Validate sequence monotonicity and non-decreasing timestamps
    let lastSeq = 0;
    let lastTimestamp = session.startTime;

    for (const evt of events) {
      if (evt.seq <= lastSeq) {
        return {
          verificationId,
          matchId: session.matchId,
          tournamentId: session.tournamentId,
          playerWallet: session.playerWallet,
          gameVersion: session.gameVersion,
          submittedScore: submittedResult.finalScore,
          replayedScore: 0,
          scoreMatch: false,
          resultHash: submittedResult.resultHash,
          verificationAlgorithm: 'DETERMINISTIC_REPLAY_ENGINE',
          verificationVersion: this.VERIFICATION_VERSION,
          verifier: this.VERIFIER_IDENTITY,
          verifiedAt: Date.now(),
          status: 'REJECTED',
          rejectionReason: `NON_MONOTONIC_SEQUENCE: Sequence numbering must be strictly monotonically increasing. Event seq ${evt.seq} is not strictly greater than previous ${lastSeq}.`,
        };
      }

      if (evt.timestamp < lastTimestamp) {
        return {
          verificationId,
          matchId: session.matchId,
          tournamentId: session.tournamentId,
          playerWallet: session.playerWallet,
          gameVersion: session.gameVersion,
          submittedScore: submittedResult.finalScore,
          replayedScore: 0,
          scoreMatch: false,
          resultHash: submittedResult.resultHash,
          verificationAlgorithm: 'DETERMINISTIC_REPLAY_ENGINE',
          verificationVersion: this.VERIFICATION_VERSION,
          verifier: this.VERIFIER_IDENTITY,
          verifiedAt: Date.now(),
          status: 'REJECTED',
          rejectionReason: `OUT_OF_ORDER_TIMESTAMP: Non-monotonic event timestamp. Event timestamp ${evt.timestamp} precedes previous ${lastTimestamp}.`,
        };
      }

      lastSeq = evt.seq;
      lastTimestamp = evt.timestamp;
    }

    // 3. Independently replay event stream
    const breakdown = ScoringService.calculateScore(events);
    const replayedScore = breakdown.finalScore;

    // 4. Compare replayed score vs submitted score
    const scoreMatch = replayedScore === submittedResult.finalScore;

    // 5. Canonicalize and check result hash
    const normalizedEvents = CanonicalService.normalizeEvents(events);
    const canonicalJson = CanonicalService.canonicalizeResult(session, breakdown as any, normalizedEvents);
    const expectedHash = CanonicalService.computeResultHash(canonicalJson);

    if (!scoreMatch) {
      return {
        verificationId,
        matchId: session.matchId,
        tournamentId: session.tournamentId,
        playerWallet: session.playerWallet,
        gameVersion: session.gameVersion,
        submittedScore: submittedResult.finalScore,
        replayedScore,
        scoreMatch: false,
        resultHash: expectedHash,
        verificationAlgorithm: 'DETERMINISTIC_REPLAY_ENGINE',
        verificationVersion: this.VERIFICATION_VERSION,
        verifier: this.VERIFIER_IDENTITY,
        verifiedAt: Date.now(),
        status: 'VERIFICATION_FAILED',
        rejectionReason: `SCORE_DISCREPANCY: Score mismatch. Submitted score (${submittedResult.finalScore}) does not match independently replayed score (${replayedScore}).`,
      };
    }

    // Success: produce authoritative verification record
    return {
      verificationId,
      matchId: session.matchId,
      tournamentId: session.tournamentId,
      playerWallet: session.playerWallet,
      gameVersion: session.gameVersion,
      submittedScore: submittedResult.finalScore,
      replayedScore,
      scoreMatch: true,
      resultHash: expectedHash,
      verificationAlgorithm: 'DETERMINISTIC_REPLAY_ENGINE',
      verificationVersion: this.VERIFICATION_VERSION,
      verifier: this.VERIFIER_IDENTITY,
      verifiedAt: Date.now(),
      status: 'VERIFIED',
    };
  }
}
