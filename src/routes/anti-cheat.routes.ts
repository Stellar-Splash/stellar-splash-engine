import { Router } from 'express';
import { AntiCheatController } from '../controllers/anti-cheat.controller';

const router = Router();

router.post('/analyze', AntiCheatController.analyzeTelemetry);

export default router;
