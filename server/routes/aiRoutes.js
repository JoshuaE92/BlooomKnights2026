const { Router } = require('express');
const { suggestCart, getHistory } = require('../controllers/aiController');

// Mounted at /api/ai in app.js.
const router = Router();

router.post('/suggest', suggestCart);
router.get('/history/:userId', getHistory);

module.exports = router;
