import { Router } from 'express';
import { LedgerSyncController } from '../controllers/ledger-sync.controller';

const router = Router();

router.get('/sync', LedgerSyncController.getSyncStatus);

export default router;
