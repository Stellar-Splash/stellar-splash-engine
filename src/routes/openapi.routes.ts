import { Router } from 'express';
import { OpenApiController } from '../controllers/openapi.controller';

const router = Router();

router.get('/openapi.json', OpenApiController.getSpec);
router.get('/', OpenApiController.renderUiDoc);

export default router;
