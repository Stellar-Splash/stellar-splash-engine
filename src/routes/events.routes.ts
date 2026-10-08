import { Router, Request, Response } from 'express';
import { EventBusService } from '../services/event-bus.service';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send initial connection packet
  res.write(`event: CONNECTED\ndata: ${JSON.stringify({ status: 'connected', timestamp: Date.now() })}\n\n`);

  EventBusService.addSubscriber(res);

  req.on('close', () => {
    EventBusService.removeSubscriber(res);
  });
});

export default router;
