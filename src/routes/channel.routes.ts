import { Router } from 'express';
import { ChannelAccountController } from '../controllers/channel-account.controller';
import { adminAuthMiddleware } from '../middleware/admin-auth.middleware';

const router = Router();

router.get('/status', ChannelAccountController.getStatus);
router.get('/queue', ChannelAccountController.getQueue);
router.post('/register', adminAuthMiddleware(), ChannelAccountController.registerChannel);

export default router;

