import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import tournamentRoutes from './routes/tournament.routes';
import gameRoutes from './routes/game.routes';
import prizePoolRoutes from './routes/prize-pool.routes';
import reconciliationRoutes from './routes/reconciliation.routes';
import eventsRoutes from './routes/events.routes';
import verificationRoutes from './routes/verification.routes';
import rankingRoutes from './routes/ranking.routes';
import agreementRoutes from './routes/agreement.routes';
import settlementRoutes from './routes/settlement.routes';
import walletRoutes from './routes/wallet.routes';
import simulationRoutes from './routes/simulation.routes';
import channelRoutes from './routes/channel.routes';
import contractEventsRoutes from './routes/contract-events.routes';
import { notFoundHandler, errorHandler } from './middleware/error.middleware';
import { createRateLimiter, SlidingWindowRateLimiter } from './middleware/rate-limiter.middleware';
import { requestIdMiddleware } from './middleware/request-id.middleware';
import { MetricsService } from './services/metrics.service';
import { CONFIG } from './config';

export const globalRateLimiter = new SlidingWindowRateLimiter({ windowMs: 60_000, maxRequests: 200 });

export const createApp = (): Express => {
  const app = express();

  app.use(requestIdMiddleware);
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(globalRateLimiter.middleware());

  // Prometheus Metrics Tracking Middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.on('finish', () => {
      MetricsService.recordHttpRequest(req.method, req.path, res.statusCode);
    });
    next();
  });

  // Rate Limiting Status Query Endpoint
  app.get('/api/rate-limit/status', (req: Request, res: Response) => {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.ip || '127.0.0.1';
    const status = globalRateLimiter.getStatus(ip);
    res.json({
      success: true,
      ip,
      ...status,
    });
  });

  // Prometheus Metrics Exposition Endpoint
  app.get('/api/metrics', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(MetricsService.formatPrometheusMetrics());
  });

  // Comprehensive Health & Telemetry Endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    const mem = process.memoryUsage();
    res.json({
      status: 'ok',
      service: 'stellar-splash-engine',
      version: '1.0.0',
      network: CONFIG.STELLAR_NETWORK,
      environment: CONFIG.NODE_ENV,
      uptimeSeconds: Math.floor(process.uptime()),
      memory: {
        rssMb: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
        heapTotalMb: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
        heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
        externalMb: Math.round((mem.external / 1024 / 1024) * 100) / 100,
      },
      process: {
        nodeVersion: process.version,
        pid: process.pid,
      },
      soroban: {
        contractId: CONFIG.CONTRACT_ID,
        rpcUrl: CONFIG.SOROBAN_RPC_URL,
        horizonUrl: CONFIG.HORIZON_URL,
      },
      timestamp: Date.now(),
    });
  });

  // Mount API domains
  app.use('/api/tournaments', tournamentRoutes);
  app.use('/api/games', gameRoutes);
  app.use('/api/tournaments', prizePoolRoutes);
  app.use('/api/reconciliation', reconciliationRoutes);
  app.use('/api/events', eventsRoutes);
  app.use('/api/verification', verificationRoutes);
  app.use('/api/rankings', rankingRoutes);
  app.use('/api/agreements', agreementRoutes);
  app.use('/api/settlements', settlementRoutes);
  app.use('/api/wallet', walletRoutes);
  app.use('/api/transactions', simulationRoutes);
  app.use('/api/channels', channelRoutes);
  app.use('/api/events/contracts', contractEventsRoutes);

  // 404 Catch-All Handler
  app.use(notFoundHandler);

  // Global Error Handler
  app.use(errorHandler);

  return app;
};
