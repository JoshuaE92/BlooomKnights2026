const { Router } = require('express');
const { listStores } = require('../controllers/storeController');

// Mounted at /api/stores in app.js.
const router = Router();

router.get('/', listStores);

module.exports = router;
