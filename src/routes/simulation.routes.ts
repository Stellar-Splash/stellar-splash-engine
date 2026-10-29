import { Router } from 'express';
import { SimulationController } from '../controllers/simulation.controller';

const router = Router();

router.post('/simulate', SimulationController.simulate);

export default router;

