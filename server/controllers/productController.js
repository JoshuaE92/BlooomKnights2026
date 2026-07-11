const { getProducts } = require('../services/externalProductAPI');
const { calculateOverallScores } = require('../utils/productScores');

// GET /api/products
// Optional query: ?stores=target,walmart  -> only those stores' products.
// Attaches the balanced score breakdown (health / environmental / price /
// overall) to each product, ranked best-overall first. Scores are computed
// across the returned set (affordability is relative to its competitors).
async function listProducts(req, res, next) {
  try {
    const stores = req.query.stores
      ? req.query.stores.split(',').map((s) => s.trim()).filter(Boolean)
      : undefined;

    const raw = await getProducts({ stores });

    const scoreById = new Map(
      calculateOverallScores(
        raw.map((p) => ({ id: p.id, price: p.price, unitPrice: p.raw?.unitPrice, openFoodFacts: p.raw?.openFoodFacts }))
      ).map((s) => [s.id, s])
    );

    const products = raw
      .map(({ raw: _raw, ...p }) => {
        const s = scoreById.get(p.id) || {};
        return {
          ...p,
          overallScore: s.overallScore ?? null,
          healthScore: s.healthScore ?? null,
          environmentalScore: s.environmentalScore ?? null,
          priceScore: s.priceScore ?? null,
        };
      })
      .sort((a, b) => (b.overallScore ?? -1) - (a.overallScore ?? -1));

    res.json({ count: products.length, products });
  } catch (err) {
    next(err);
  }
}

module.exports = { listProducts };
