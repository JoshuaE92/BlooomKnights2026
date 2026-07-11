import { Router } from 'express';
import { listStores } from '../controllers/storeController.js';

// Mounted at /api/stores in app.js.
const router = Router();

router.get('/', listStores);

export default router;
