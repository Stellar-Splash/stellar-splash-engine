import { Router } from 'express';
import { VerificationController } from '../controllers/verification.controller';

const router = Router();

router.post('/match/:id', VerificationController.verifyMatch);
router.get('/match/:id', VerificationController.getVerification);

export default router;
