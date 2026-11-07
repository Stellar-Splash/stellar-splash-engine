import { createApp } from './app';
import { CONFIG } from './config';
import { StoreService } from './services/store.service';
import { ShutdownService } from './services/shutdown.service';
import { TournamentExpirationWorker } from './services/expiration.worker';

// Load persisted state if available
StoreService.initializePersistence().catch((err) => {
  console.warn('Initial persistent snapshot load failed:', err);
});

const app = createApp();

const server = app.listen(CONFIG.PORT, () => {
  console.log(`🌊 Stellar Splash Engine running on http://localhost:${CONFIG.PORT}`);
  console.log(`🌐 Connected to ${CONFIG.STELLAR_NETWORK} via ${CONFIG.HORIZON_URL}`);
  TournamentExpirationWorker.start();
});

ShutdownService.init(server);
