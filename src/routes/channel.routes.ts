import { Router } from 'express';
import { ChannelAccountController } from '../controllers/channel-account.controller';

const router = Router();

router.get('/status', ChannelAccountController.getStatus);
router.get('/queue', ChannelAccountController.getQueue);
router.post('/register', ChannelAccountController.registerChannel);

export default router;

