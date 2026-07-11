const { Router } = require('express');
const { listProducts, greenSynthesis } = require('../controllers/productController');
const { protect } = require('../middleware/authMiddleware');

// Mounted at /api/products in app.js.
const router = Router();

router.get('/', listProducts);
// Protected — it spends Gemini quota, so it requires a logged-in user.
router.get('/:id/green-synthesis', protect, greenSynthesis);

module.exports = router;
