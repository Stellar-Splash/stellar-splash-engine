import { Router } from 'express';
import { WalletController } from '../controllers/wallet.controller';

const router = Router();

router.post('/fund', WalletController.fundAccount);
router.get('/balance/:address', WalletController.getBalances);
router.get('/status/:hash', WalletController.getTransactionStatus);

export default router;

