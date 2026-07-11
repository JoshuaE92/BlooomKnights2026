import { getProducts } from '../services/externalProductAPI.js';
import { withGreenImpact } from '../utils/greenImpactCalculator.js';

// GET /api/products
// Optional query: ?stores=walmart,costco  -> only those stores' products.
// The controller's job is HTTP glue: read the request, call the service,
// shape the response. It never touches files or knows where data comes from.
export async function listProducts(req, res, next) {
  try {
    const stores = req.query.stores
      ? req.query.stores.split(',').map((s) => s.trim()).filter(Boolean)
      : undefined;

    const raw = await getProducts({ stores });

    // Attach the computed green score at the edge, then rank greenest-first.
    const products = raw
      .map(withGreenImpact)
      .sort((a, b) => b.greenImpact - a.greenImpact);

    res.json({ count: products.length, products });
  } catch (err) {
    next(err); // hand off to errorHandler
  }
}
