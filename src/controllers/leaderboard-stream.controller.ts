import { Request, Response } from 'express';
import { leaderboardRelayer } from '../services/leaderboard-relayer.service';

export class LeaderboardStreamController {
  public static streamLiveUpdates(req: Request, res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const tournamentId = req.query.tournamentId ? parseInt(req.query.tournamentId as string) : undefined;

    // Send initial snapshot if tournamentId provided
    if (tournamentId) {
      const snap = leaderboardRelayer.getSnapshot(tournamentId);
      res.write(`data: ${JSON.stringify({ type: 'SNAPSHOT', snapshot: snap })}\n\n`);
    } else {
      res.write(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: Date.now() })}\n\n`);
    }

    const unsubscribe = leaderboardRelayer.subscribe((delta) => {
      if (!tournamentId || delta.tournamentId === tournamentId) {
        res.write(`data: ${JSON.stringify(delta)}\n\n`);
      }
    });

    req.on('close', () => {
      unsubscribe();
      res.end();
    });
  }

  public static getSnapshot(req: Request, res: Response): void {
    const tournamentId = parseInt(req.params.tournamentId);
    if (isNaN(tournamentId)) {
      res.status(400).json({ success: false, error: 'Valid tournamentId required' });
      return;
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const snapshot = leaderboardRelayer.getSnapshot(tournamentId, limit);
    res.json({
      success: true,
      snapshot,
    });
  }

  public static submitScore(req: Request, res: Response): void {
    const { tournamentId, playerWallet, score, winRateBps } = req.body;
    if (typeof tournamentId !== 'number' || !playerWallet || typeof score !== 'number') {
      res.status(400).json({
        success: false,
        error: 'tournamentId (number), playerWallet (string), and score (number) are required',
      });
      return;
    }

    const delta = leaderboardRelayer.updatePlayerScore(
      tournamentId,
      playerWallet,
      score,
      winRateBps
    );

    res.json({
      success: true,
      delta,
    });
  }
}
