import { Request, Response } from 'express';
import { friendbotService } from '../services/friendbot.service';
import { walletBalanceTracker } from '../services/wallet-balance-tracker.service';
import { transactionStatusPoller } from '../services/transaction-poller.service';

export class WalletController {
  public static async fundAccount(req: Request, res: Response): Promise<void> {
    const { destination } = req.body;
    if (!destination) {
      res.status(400).json({ success: false, error: 'Destination address is required' });
      return;
    }

    const result = await friendbotService.fundAccount({ destination });
    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    res.json(result);
  }

  public static async getBalances(req: Request, res: Response): Promise<void> {
    const address = req.params.address;
    if (!address) {
      res.status(400).json({ success: false, error: 'Address parameter is required' });
      return;
    }

    const result = await walletBalanceTracker.getBalances(address);
    res.json(result);
  }

  public static async getTransactionStatus(req: Request, res: Response): Promise<void> {
    const hash = req.params.hash;
    if (!hash) {
      res.status(400).json({ success: false, error: 'Transaction hash is required' });
      return;
    }

    const result = await transactionStatusPoller.getStatus(hash);
    res.json(result);
  }
}
