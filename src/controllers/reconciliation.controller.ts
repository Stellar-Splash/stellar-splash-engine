import { Request, Response } from 'express';
import { StoreService } from '../services/store.service';

export class ReconciliationController {
  public static getReconciliation(req: Request, res: Response): void {
    const { tournamentId } = req.params;
    const record = StoreService.getReconciliation(tournamentId);

    res.json({
      success: true,
      reconciliation: record,
    });
  }

  public static getAllReconciliations(_req: Request, res: Response): void {
    const tournaments = StoreService.getAllTournaments();
    const records = tournaments.map((t) => StoreService.getReconciliation(t.id));

    res.json({
      success: true,
      count: records.length,
      records,
    });
  }
}
