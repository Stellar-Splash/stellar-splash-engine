import { Request, Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { StoreService } from '../services/store.service';
import { ScoringService } from '../services/scoring.service';
import { CanonicalService } from '../services/canonical.service';
import { EventBusService } from '../services/event-bus.service';
import { MatchSession, GameEvent } from '../types';
import { CONFIG } from '../config';

const StartGameSchema = z.object({
  tournamentId: z.string(),
  playerWallet: z.string().min(56).max(56),
  gameId: z.string().default('splash-rush'),
});

const CompleteGameSchema = z.object({
  matchId: z.string(),
  sessionToken: z.string(),
  endTime: z.number().int().positive(),
  events: z.array(
    z.object({
      seq: z.number().int(),
      timestamp: z.number().int(),
      type: z.enum(['TARGET_HIT', 'COMBO_STREAK', 'HAZARD_HIT', 'MULTIPLIER_UP']),
      points: z.number().int(),
      combo: z.number().int(),
      multiplier: z.number().int(),
      data: z.record(z.unknown()).optional(),
    }),
  ),
});

export class GameController {
  public static startGame(req: Request, res: Response): void {
    const parseResult = StartGameSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, errors: parseResult.error.errors });
      return;
    }

    const { tournamentId, playerWallet, gameId } = parseResult.data;

    const tournament = StoreService.getTournamentById(tournamentId);
    if (!tournament) {
      res.status(404).json({ success: false, error: 'Tournament not found' });
      return;
    }

    if (tournament.state !== 'OPEN' && tournament.state !== 'IN_PROGRESS') {
      res.status(400).json({
        success: false,
        error: `Cannot launch game: Tournament is not in an active state (${tournament.state})`,
      });
      return;
    }

    const participant = StoreService.getParticipant(tournamentId, playerWallet);
    if (!participant) {
      res.status(403).json({
        success: false,
        error: 'Player is not registered in this tournament. Must join tournament before playing.',
      });
      return;
    }

    const matchId = `match-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const sessionToken = crypto.randomBytes(24).toString('hex');
    const version = CONFIG.GAME_VERSIONS['splash-rush'] || '1.0.0';

    const session: MatchSession = {
      matchId,
      tournamentId,
      playerWallet,
      gameId,
      gameVersion: version,
      sessionToken,
      startTime: Date.now(),
      status: 'STARTED',
    };

    StoreService.createMatchSession(session);

    EventBusService.broadcast('MATCH_STARTED', {
      matchId,
      tournamentId,
      playerWallet,
      startTime: session.startTime,
    });

    res.status(201).json({
      success: true,
      match: {
        matchId: session.matchId,
        tournamentId: session.tournamentId,
        playerWallet: session.playerWallet,
        gameId: session.gameId,
        gameVersion: session.gameVersion,
        sessionToken: session.sessionToken,
        startTime: session.startTime,
      },
    });
  }

  public static completeGame(req: Request, res: Response): void {
    const parseResult = CompleteGameSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, errors: parseResult.error.errors });
      return;
    }

    const { matchId, sessionToken, endTime, events } = parseResult.data;

    const session = StoreService.getMatchSession(matchId);
    if (!session) {
      res.status(404).json({ success: false, error: 'Match session not found' });
      return;
    }

    if (session.sessionToken !== sessionToken) {
      res
        .status(403)
        .json({ success: false, error: 'Invalid session token. Submission rejected.' });
      return;
    }

    // Idempotency check: Cannot complete the same match twice
    if (session.status === 'COMPLETED') {
      const existingResult = StoreService.getGameResult(matchId);
      res.status(200).json({
        success: true,
        message: 'Match was already finalized (idempotent response).',
        result: existingResult,
      });
      return;
    }

    if (endTime < session.startTime) {
      res.status(400).json({ success: false, error: 'End time cannot be earlier than start time' });
      return;
    }

    // Replay attack prevention: Compute deterministic fingerprint for event stream
    if (events.length > 0) {
      const canonicalEvents = CanonicalService.canonicalSerialize(
        CanonicalService.normalizeEvents(events as GameEvent[]),
      );
      const eventFingerprint = crypto.createHash('sha256').update(canonicalEvents).digest('hex');

      const existingMatch = StoreService.getEventStreamMatch(eventFingerprint);
      if (existingMatch && existingMatch !== matchId) {
        res.status(409).json({
          success: false,
          error: `REPLAY_ATTACK_DETECTED: This exact event sequence has already been submitted for match ${existingMatch}.`,
        });
        return;
      }

      StoreService.markEventStreamConsumed(eventFingerprint, matchId);
    }

    // Deterministically build and verify game result from event stream
    const result = ScoringService.buildGameResult(session, events as GameEvent[], endTime);

    // Finalize session
    session.status = 'COMPLETED';
    session.endTime = endTime;
    session.events = events as GameEvent[];
    StoreService.updateMatchSession(session);

    // Save canonical result
    StoreService.saveGameResult(result);

    // Update participant record in tournament leaderboard
    StoreService.updateParticipantScore(
      session.tournamentId,
      session.playerWallet,
      result.finalScore,
    );

    EventBusService.broadcast('MATCH_COMPLETED', {
      matchId: result.matchId,
      tournamentId: result.tournamentId,
      playerWallet: result.playerWallet,
      finalScore: result.finalScore,
      resultHash: result.resultHash,
      accuracy: result.accuracy,
    });

    res.status(200).json({
      success: true,
      result,
    });
  }

  public static getMatchResult(req: Request, res: Response): void {
    const { id } = req.params;
    const result = StoreService.getGameResult(id);

    if (!result) {
      res.status(404).json({ success: false, error: 'Match result not found' });
      return;
    }

    res.json({ success: true, result });
  }

  /**
   * Exports full match audit payload including session parameters, event stream,
   * score breakdown, and cryptographic verification status for independent auditing.
   */
  public static exportMatchReplay(req: Request, res: Response): void {
    const { id } = req.params;
    const session = StoreService.getMatchSession(id);
    const result = StoreService.getGameResult(id);

    if (!session && !result) {
      res.status(404).json({ success: false, error: 'Match not found for replay export' });
      return;
    }

    const verification = StoreService.getVerification(id);
    const exportedAt = Date.now();

    const payload = {
      success: true,
      matchId: id,
      tournamentId: session?.tournamentId || result?.tournamentId,
      playerWallet: session?.playerWallet || result?.playerWallet,
      gameId: session?.gameId || 'splash-rush',
      gameVersion: session?.gameVersion || result?.gameVersion,
      startTime: session?.startTime || result?.startTime,
      endTime: session?.endTime || result?.endTime,
      durationMs: result?.durationMs,
      result: result || null,
      events: session?.events || [],
      eventsCount: session?.events?.length || result?.eventsCount || 0,
      verification: verification || null,
      exportedAt,
    };

    const archiveDigest = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');

    res.setHeader('X-Audit-Match-Id', id);
    res.setHeader('X-Audit-Result-Hash', result?.resultHash || 'NONE');
    res.setHeader('X-Audit-Archive-Digest', archiveDigest);
    res.setHeader('X-Audit-Exported-At', String(exportedAt));

    res.json({
      ...payload,
      archiveDigest,
    });
  }
}
