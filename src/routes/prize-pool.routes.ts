import { Router } from 'express';
import { PrizePoolController } from '../controllers/prize-pool.controller';

const router = Router();

router.get('/:id/prize-pool', PrizePoolController.getPrizePool);
router.post('/:id/prize-pool/funding', PrizePoolController.fundPrizePool);

export default router;
