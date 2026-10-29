import { Request, Response } from 'express';
import { sorobanEventSubscriber } from '../services/soroban-event-subscriber.service';

export class EventStreamController {
  public static streamEvents(req: Request, res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    // Send connection greeting
    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: Date.now() })}\n\n`);

    // Stream any recent events immediately to catch up client
    const recent = sorobanEventSubscriber.getRecentEvents(10);
    for (const ev of recent) {
      res.write(`data: ${JSON.stringify(ev)}\n\n`);
    }

    // Subscribe to new real-time contract events
    const unsubscribe = sorobanEventSubscriber.addListener((event) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    });

    req.on('close', () => {
      unsubscribe();
      res.end();
    });
  }

  public static getRecentEvents(req: Request, res: Response): void {
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 200);
    const events = sorobanEventSubscriber.getRecentEvents(limit);
    res.json({
      success: true,
      count: events.length,
      events,
    });
  }

  public static async queryContractEvents(req: Request, res: Response): Promise<void> {
    try {
      const startLedger = req.query.startLedger ? parseInt(req.query.startLedger as string) : undefined;
      const contractIds = req.query.contractId ? [req.query.contractId as string] : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

      const events = await sorobanEventSubscriber.fetchEvents({
        startLedger,
        contractIds,
        limit,
      });

      res.json({
        success: true,
        count: events.length,
        events,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err?.message || 'Failed to query Soroban events',
      });
    }
  }
}
