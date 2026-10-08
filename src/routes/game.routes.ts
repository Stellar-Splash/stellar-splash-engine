import { Router } from 'express';
import { GameController } from '../controllers/game.controller';

const router = Router();

router.post('/start', GameController.startGame);
router.post('/complete', GameController.completeGame);
router.get('/matches/:id/result', GameController.getMatchResult);

export default router;
