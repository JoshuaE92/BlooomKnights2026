const { getStoresForZip } = require('../services/geoService');

// GET /api/stores?zip=10001
// Returns the stores available for a zipcode so the user can pick from them.
async function listStores(req, res, next) {
  try {
    const { zip } = req.query;
    const stores = await getStoresForZip(zip);
    res.json({ zip: zip || null, count: stores.length, stores });
  } catch (err) {
    next(err);
  }
}

module.exports = { listStores };
