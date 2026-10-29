import { Router } from 'express';
import { CircuitBreakerController } from '../controllers/circuit-breaker.controller';

const router = Router();

router.get('/status', CircuitBreakerController.getStatus);

export default router;
