import { Router } from 'express';
import { suggestCart, getHistory } from '../controllers/aiController.js';

// Mounted at /api/ai in app.js.
const router = Router();

router.post('/suggest', suggestCart);
router.get('/history/:userId', getHistory);

export default router;
