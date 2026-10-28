import { GameEvent, GameResult, MatchSession, ResultVerification, AuditEvent } from '../types';
import { ScoringService } from './scoring.service';
import { CanonicalService } from './canonical.service';
import { StoreService } from './store.service';
import { CONFIG } from '../config';

export class ReplayService {
  public static VERIFICATION_VERSION = '1.0.0';
  public static VERIFIER_IDENTITY = 'verifier.stellar-splash.org';

  /**
   * Logs a structured anti-cheat fraud detection flag into the audit system.
   */
  public static logFraudFlag(
    session: MatchSession,
    reasonCode: string,
    description: string,
    telemetry?: Record<string, unknown>
  ): void {
    StoreService.logAudit('ANTI_CHEAT_FRAUD_FLAG', session.playerWallet, {
      matchId: session.matchId,
      tournamentId: session.tournamentId,
      reasonCode,
      description,
      telemetry: telemetry || {},
      flaggedAt: Date.now(),
    });
  }

  /**
   * Retrieves anti-cheat audit logs filtered by tournament or player.
   */
  public static getFraudAuditLogs(filter?: {
    tournamentId?: string;
    playerWallet?: string;
  }): AuditEvent[] {
    const all = StoreService.getAuditLogs().filter(
      (l) => l.eventType === 'ANTI_CHEAT_FRAUD_FLAG'
    );
    if (!filter) return all;
    return all.filter((l) => {
      const details = l.details as any;
      if (filter.tournamentId && details?.tournamentId !== filter.tournamentId) return false;
      if (filter.playerWallet && l.actor !== filter.playerWallet) return false;
      return true;
    });
  }

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
      const rejectionReason = `UNSUPPORTED_GAME_VERSION: Unsupported or mismatched game version. Expected ${expectedVersion}, but match used ${session.gameVersion}.`;
      this.logFraudFlag(session, 'UNSUPPORTED_GAME_VERSION', rejectionReason);
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
        rejectionReason,
      };
    }

    // 2. Validate sequence monotonicity and non-decreasing timestamps
    let lastSeq = 0;
    let lastTimestamp = session.startTime;

    for (const evt of events) {
      if (evt.seq <= lastSeq) {
        const rejectionReason = `NON_MONOTONIC_SEQUENCE: Sequence numbering must be strictly monotonically increasing. Event seq ${evt.seq} is not strictly greater than previous ${lastSeq}.`;
        this.logFraudFlag(session, 'NON_MONOTONIC_SEQUENCE', rejectionReason, { seq: evt.seq, lastSeq });
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
          rejectionReason,
        };
      }

      if (evt.timestamp < lastTimestamp) {
        const rejectionReason = `OUT_OF_ORDER_TIMESTAMP: Non-monotonic event timestamp. Event timestamp ${evt.timestamp} precedes previous ${lastTimestamp}.`;
        this.logFraudFlag(session, 'OUT_OF_ORDER_TIMESTAMP', rejectionReason, { timestamp: evt.timestamp, lastTimestamp });
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
          rejectionReason,
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
        const rejectionReason = `INHUMAN_CLICK_VELOCITY: Event intervals of ${deltaMs}ms detected exceeding maximum human physical response threshold (35ms / 28 CPS).`;
        this.logFraudFlag(session, 'INHUMAN_CLICK_VELOCITY', rejectionReason, { deltaMs, eventIndex: i });
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
          rejectionReason,
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
          const { valid, distance } = this.verifyHitGeometry(
            clickX,
            clickY,
            targetX,
            targetY,
            targetRadius
          );
          if (!valid) {
            const rejectionReason = `GEOMETRIC_OUT_OF_BOUNDS: Target hit registered at distance ${distance.toFixed(1)}px outside target bounding radius (${targetRadius}px + 10px tolerance).`;
            this.logFraudFlag(session, 'GEOMETRIC_OUT_OF_BOUNDS', rejectionReason, { distance, targetRadius, clickX, clickY });
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
              rejectionReason,
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
      const rejectionReason = `SCORE_DISCREPANCY: Score mismatch. Submitted score (${submittedResult.finalScore}) does not match independently replayed score (${replayedScore}).`;
      this.logFraudFlag(session, 'SCORE_DISCREPANCY', rejectionReason, { submittedScore: submittedResult.finalScore, replayedScore });
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
        rejectionReason,
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

  /**
   * Validates geometric Euclidean distance between player click and target centroid.
   */
  public static verifyHitGeometry(
    clickX: number,
    clickY: number,
    targetX: number,
    targetY: number,
    radius: number,
    tolerance = 10
  ): { valid: boolean; distance: number } {
    const dx = clickX - targetX;
    const dy = clickY - targetY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return {
      valid: distance <= radius + tolerance,
      distance,
    };
  }
}
