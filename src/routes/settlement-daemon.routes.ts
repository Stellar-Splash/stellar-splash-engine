import { Router } from 'express';
import { SettlementDaemonController } from '../controllers/settlement-daemon.controller';

const router = Router();

router.get('/stats', SettlementDaemonController.getStats);
router.get('/jobs', SettlementDaemonController.getJobs);
router.post('/evaluate', SettlementDaemonController.triggerEvaluation);
router.post('/register', SettlementDaemonController.registerTournament);

export default router;
