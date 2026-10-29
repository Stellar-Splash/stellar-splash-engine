import { Router } from 'express';
import { EventStreamController } from '../controllers/event-stream.controller';

const router = Router();

router.get('/stream', EventStreamController.streamEvents);
router.get('/recent', EventStreamController.getRecentEvents);
router.get('/query', EventStreamController.queryContractEvents);

export default router;

