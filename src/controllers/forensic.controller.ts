import { Request, Response } from 'express';
import { ForensicPackagerService } from '../services/forensic-packager.service';

export class ForensicController {
  public static exportPackage(req: Request, res: Response): void {
    const matchId = req.params.matchId;
    if (!matchId) {
      res.status(400).json({ success: false, error: 'matchId is required' });
      return;
    }

    const pkg = ForensicPackagerService.getPackage(matchId);
    if (!pkg) {
      res.status(404).json({
        success: false,
        error: `Forensic package for match ${matchId} not found`,
      });
      return;
    }

    res.json({
      success: true,
      data: pkg,
    });
  }

  public static assemblePackage(req: Request, res: Response): void {
    const {
      matchId,
      tournamentId,
      playerWallets,
      gameTitle,
      seed,
      tickCount,
      finalScores,
      isFlagged,
      antiCheatReasons,
    } = req.body;

    if (!matchId || typeof tournamentId !== 'number') {
      res.status(400).json({
        success: false,
        error: 'matchId and tournamentId are required',
      });
      return;
    }

    const pkg = ForensicPackagerService.assemblePackage({
      matchId,
      tournamentId,
      playerWallets: playerWallets || [],
      gameTitle: gameTitle || 'Unknown Game',
      seed: seed || 0,
      tickCount: tickCount || 0,
      finalScores: finalScores || {},
      isFlagged: !!isFlagged,
      antiCheatReasons: antiCheatReasons || [],
    });

    res.json({
      success: true,
      data: pkg,
    });
  }
}
