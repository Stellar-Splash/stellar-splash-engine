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

  // Global Error Handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[Engine Error]:', err);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: err.message,
    });
  });

  return app;
};
