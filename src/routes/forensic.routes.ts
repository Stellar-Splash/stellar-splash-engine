import { Router } from 'express';
import { ForensicController } from '../controllers/forensic.controller';

const router = Router();

router.get('/:matchId', ForensicController.exportPackage);
router.post('/assemble', ForensicController.assemblePackage);

export default router;
