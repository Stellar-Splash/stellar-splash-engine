import { Request, Response } from 'express';
import { channelAccountManager } from '../services/channel-account.service';

export class ChannelAccountController {
  public static getStatus(req: Request, res: Response): void {
    const metrics = channelAccountManager.getMetrics();
    res.json({
      success: true,
      data: metrics,
    });
  }

  public static getQueue(req: Request, res: Response): void {
    const queue = channelAccountManager.getQueueItems();
    res.json({
      success: true,
      count: queue.length,
      data: queue,
    });
  }

  public static registerChannel(req: Request, res: Response): void {
    const { publicKey, secretKey, balanceStroops } = req.body;
    if (!publicKey || !secretKey) {
      res.status(400).json({
        success: false,
        error: 'Both publicKey and secretKey are required',
      });
      return;
    }

    channelAccountManager.registerChannel(publicKey, secretKey, balanceStroops);
    res.json({
      success: true,
      message: `Channel account ${publicKey.slice(0, 4)}...${publicKey.slice(-4)} registered successfully`,
      metrics: channelAccountManager.getMetrics(),
    });
  }
}
