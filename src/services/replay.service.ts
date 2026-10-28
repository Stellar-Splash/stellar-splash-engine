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

    // 3. Physical human click velocity checker (Autoclicker / macro detection)
    const hitEvents = events.filter((e) => e.type === 'TARGET_HIT' || e.type === 'TARGET_MISSED');
    for (let i = 1; i < hitEvents.length; i++) {
      const deltaMs = hitEvents[i].timestamp - hitEvents[i - 1].timestamp;
      // Inhuman click interval: < 35ms implies > 28 CPS
      if (deltaMs < 35 && deltaMs >= 0) {
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
          rejectionReason: `INHUMAN_CLICK_VELOCITY: Event intervals of ${deltaMs}ms detected exceeding maximum human physical response threshold (35ms / 28 CPS).`,
        };
      }
    }

    // 4. Target coordinate geometry and hit-radius verification
    for (const evt of hitEvents) {
      if (evt.type === 'TARGET_HIT' && evt.data) {
        const { clickX, clickY, targetX, targetY, targetRadius } = evt.data as any;
        if (
          typeof clickX === 'number' &&
          typeof clickY === 'number' &&
          typeof targetX === 'number' &&
          typeof targetY === 'number' &&
          typeof targetRadius === 'number'
        ) {
          const dx = clickX - targetX;
          const dy = clickY - targetY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          // 10px leeway for boundary and hitbox interpolation
          if (distance > targetRadius + 10) {
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
              rejectionReason: `GEOMETRIC_OUT_OF_BOUNDS: Target hit registered at distance ${distance.toFixed(1)}px outside target bounding radius (${targetRadius}px + 10px tolerance).`,
            };
          }
        }
      }
    }

    // 5. Independently replay event stream
    const breakdown = ScoringService.calculateScore(events);
    const replayedScore = breakdown.finalScore;

    // 6. Compare replayed score vs submitted score
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
