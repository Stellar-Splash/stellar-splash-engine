import { Request, Response } from 'express';
import { ledgerSequenceSync } from '../services/ledger-sync.service';

export class LedgerSyncController {
  public static async getSyncStatus(_req: Request, res: Response): Promise<void> {
    const status = await ledgerSequenceSync.checkSync();
    res.json({
      success: true,
      data: status,
    });
  }
}
