import { Request, Response } from 'express';
import { webhookDispatcher } from '../services/webhook-dispatcher.service';

export class WebhookController {
  public static listWebhooks(_req: Request, res: Response): void {
    const list = webhookDispatcher.getWebhooks();
    res.json({
      success: true,
      count: list.length,
      data: list,
    });
  }

  public static registerWebhook(req: Request, res: Response): void {
    const { url, events, secret } = req.body;
    if (!url || !Array.isArray(events) || events.length === 0) {
      res.status(400).json({
        success: false,
        error: 'url (string) and events (non-empty array) are required',
      });
      return;
    }

    const reg = webhookDispatcher.registerWebhook(url, events, secret);
    res.status(201).json({
      success: true,
      data: reg,
    });
  }

  public static deleteWebhook(req: Request, res: Response): void {
    const id = req.params.id;
    const deleted = webhookDispatcher.deleteWebhook(id);
    if (!deleted) {
      res.status(404).json({ success: false, error: `Webhook ${id} not found` });
      return;
    }
    res.json({ success: true, message: `Webhook ${id} deleted` });
  }

  public static getHistory(req: Request, res: Response): void {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const history = webhookDispatcher.getHistory(limit);
    res.json({
      success: true,
      count: history.length,
      data: history,
    });
  }
}
