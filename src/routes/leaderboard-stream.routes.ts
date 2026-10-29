import { Router } from 'express';
import { LeaderboardStreamController } from '../controllers/leaderboard-stream.controller';

const router = Router();

router.get('/stream', LeaderboardStreamController.streamLiveUpdates);
router.get('/:tournamentId', LeaderboardStreamController.getSnapshot);
router.post('/score', LeaderboardStreamController.submitScore);

export default router;
