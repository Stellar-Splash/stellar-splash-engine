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
import { notFoundHandler, errorHandler } from './middleware/error.middleware';

export const createApp = (): Express => {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  // Health check endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'stellar-splash-engine',
      network: 'Stellar Testnet',
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

  // 404 Catch-All Handler
  app.use(notFoundHandler);

  // Global Error Handler
  app.use(errorHandler);

  return app;
};
