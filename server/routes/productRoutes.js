const { Router } = require('express');
const { listProducts } = require('../controllers/productController');

// Mounted at /api/products in app.js.
const router = Router();

router.get('/', listProducts);

module.exports = router;
