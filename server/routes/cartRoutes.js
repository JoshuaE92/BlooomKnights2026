const { Router } = require('express');
const { saveCart, getCarts } = require('../controllers/cartController');
const { protect } = require('../middleware/authMiddleware');

// Mounted at /api/carts in app.js. Carts belong to the logged-in user.
const router = Router();

router.post('/', protect, saveCart);
router.get('/', protect, getCarts);

module.exports = router;
