import { Router } from 'express';
import { AgreementController } from '../controllers/agreement.controller';

const router = Router();

router.get('/:tournamentId', AgreementController.getTournamentAgreements);
router.get('/:tournamentId/active', AgreementController.getActiveAgreement);
router.post('/', AgreementController.createAgreement);
router.post('/:tournamentId/:version/approve', AgreementController.approveAgreement);
router.post('/:tournamentId/:version/lock', AgreementController.lockAgreement);

export default router;
