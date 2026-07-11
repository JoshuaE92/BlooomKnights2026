import { Router } from 'express';
import { listProducts } from '../controllers/productController.js';

// All paths here are relative to where this router is mounted in app.js
// (mounted at /api/products, so router.get('/') = GET /api/products).
const router = Router();

router.get('/', listProducts);

export default router;
