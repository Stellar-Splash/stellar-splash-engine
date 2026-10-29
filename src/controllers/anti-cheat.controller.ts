import { Request, Response } from 'express';
import { AntiCheatEntropyService } from '../services/anti-cheat-entropy.service';
import { PlayerInputTelemetry } from '../types/anti-cheat-entropy';

export class AntiCheatController {
  public static analyzeTelemetry(req: Request, res: Response): void {
    const telemetry: PlayerInputTelemetry = req.body;

    if (!telemetry || !telemetry.playerId || !telemetry.matchId) {
      res.status(400).json({
        success: false,
        error: 'Missing required telemetry fields: playerId, matchId',
      });
      return;
    }

    if (!Array.isArray(telemetry.mouseMovements) || !Array.isArray(telemetry.clicks)) {
      res.status(400).json({
        success: false,
        error: 'mouseMovements and clicks must be arrays of TrajectoryPoint',
      });
      return;
    }

    const report = AntiCheatEntropyService.evaluate(telemetry);
    res.json({
      success: true,
      report,
    });
  }
}
