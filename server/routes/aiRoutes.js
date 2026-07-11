const { Router } = require('express');
const { suggestCart, getHistory } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');

// Mounted at /api/ai in app.js. All AI routes require a logged-in user —
// the userId comes from the JWT (req.user), never from the request body.
const router = Router();

router.post('/suggest', protect, validateRequest(['prompt']), suggestCart);
router.get('/history', protect, getHistory);

module.exports = router;
