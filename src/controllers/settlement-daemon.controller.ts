import { Request, Response } from 'express';
import { settlementDaemon } from '../services/settlement-daemon.service';

export class SettlementDaemonController {
  public static getStats(_req: Request, res: Response): void {
    const stats = settlementDaemon.getStats();
    res.json({
      success: true,
      data: stats,
    });
  }

  public static getJobs(_req: Request, res: Response): void {
    const jobs = settlementDaemon.getAllJobs();
    res.json({
      success: true,
      count: jobs.length,
      data: jobs,
    });
  }

  public static async triggerEvaluation(_req: Request, res: Response): Promise<void> {
    const settled = await settlementDaemon.evaluatePendingJobs();
    res.json({
      success: true,
      evaluatedCount: settled.length,
      settledJobs: settled,
    });
  }

  public static registerTournament(req: Request, res: Response): void {
    const { tournamentId, endedAt, disputeWindowDurationMs } = req.body;
    if (typeof tournamentId !== 'number') {
      res.status(400).json({
        success: false,
        error: 'tournamentId must be a number',
      });
      return;
    }

    const job = settlementDaemon.registerCompletedTournament(
      tournamentId,
      endedAt,
      disputeWindowDurationMs
    );

    res.json({
      success: true,
      job,
    });
  }
}
