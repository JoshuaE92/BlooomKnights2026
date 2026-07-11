import { getStoresForZip } from '../services/geoService.js';

// GET /api/stores?zip=10001
// Returns the stores available for a zipcode so the user can pick from them.
export async function listStores(req, res, next) {
  try {
    const { zip } = req.query;
    const stores = await getStoresForZip(zip);
    res.json({ zip: zip || null, count: stores.length, stores });
  } catch (err) {
    next(err);
  }
}
