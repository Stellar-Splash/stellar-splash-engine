import { Router } from 'express';
import { SettlementController } from '../controllers/settlement.controller';

const router = Router();

// Eligibility & preview
router.get('/:tournamentId/eligibility', SettlementController.getEligibility);
router.get('/:tournamentId/preview', SettlementController.getPreview);

// Authorization & Execution
router.post('/:tournamentId/authorize', SettlementController.authorizeSettlement);
router.post('/:tournamentId/execute', SettlementController.executeSettlement);

// Lookup & Reconciliation
router.get('/:tournamentId', SettlementController.getSettlement);
router.post('/:settlementId/reconcile', SettlementController.reconcile);
router.get('/player/:playerWallet', SettlementController.getPlayerPayouts);

export default router;
