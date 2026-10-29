import { Router } from 'express';
import { ReconciliationController } from '../controllers/reconciliation.controller';

const router = Router();

router.get('/', ReconciliationController.getAllReconciliations);
router.get('/vault/solvency', ReconciliationController.getVaultSolvency);
router.get('/:tournamentId', ReconciliationController.getReconciliation);

export default router;
