import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller';

const router = Router();

router.get('/', WebhookController.listWebhooks);
router.post('/', WebhookController.registerWebhook);
router.delete('/:id', WebhookController.deleteWebhook);
router.get('/history', WebhookController.getHistory);

export default router;
