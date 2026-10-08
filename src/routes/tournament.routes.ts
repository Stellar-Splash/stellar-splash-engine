import { Router } from 'express';
import { TournamentController } from '../controllers/tournament.controller';

const router = Router();

router.get('/', TournamentController.listTournaments);
router.post('/', TournamentController.createTournament);
router.get('/:id', TournamentController.getTournament);
router.post('/:id/join', TournamentController.joinTournament);
router.get('/:id/leaderboard', TournamentController.getLeaderboard);

export default router;
