import { Router } from 'express';
import { RankingController } from '../controllers/ranking.controller';

const router = Router();

router.get('/:tournamentId', RankingController.getTournamentRanking);
router.post('/:tournamentId/finalize', RankingController.finalizeRanking);

export default router;
