import { createApp } from './app';
import { CONFIG } from './config';

const app = createApp();

app.listen(CONFIG.PORT, () => {
  console.log(`🌊 Stellar Splash Engine running on http://localhost:${CONFIG.PORT}`);
  console.log(`🌐 Connected to ${CONFIG.STELLAR_NETWORK} via ${CONFIG.HORIZON_URL}`);
});
