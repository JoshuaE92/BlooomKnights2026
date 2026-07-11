const Product = require('../models/Product');

// THE SWAP POINT.
// Now backed by MongoDB (seed with `npm run seed`). Tomorrow: a real store
// API or scraper. As long as these return the same product shape, nothing
// else changes.

// Map a lean Mongo doc to the API contract shape (slug _id -> id).
const toApi = ({ _id, __v, ...rest }) => ({ id: _id, ...rest });

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Get every product for the given stores (used by the /api/products endpoint).
async function getProducts({ stores } = {}) {
  const filter =
    stores && stores.length ? { store: { $in: stores.map((s) => s.toLowerCase()) } } : {};
  const docs = await Product.find(filter).lean();
  return docs.map(toApi);
}

// Search the stores for products matching one needed item (e.g. "corn tortillas").
// This is the per-item query in the two-phase AI flow: instead of dumping the
// whole catalog at the AI, we narrow to a handful of relevant candidates here.
async function searchProducts({ stores, query, limit = 10 } = {}) {
  const base = {};
  if (stores && stores.length) {
    base.store = { $in: stores.map((s) => s.toLowerCase()) };
  }

  // Break "marinara sauce" -> ["marinara","sauce"].
  const terms = (query || '')
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length > 2);

  if (!terms.length) {
    const docs = await Product.find(base).limit(limit).lean();
    return docs.map(toApi);
  }

  // Each term must appear in the product's name OR tags.
  const perTerm = (t) => {
    const rx = new RegExp(escapeRegex(t), 'i');
    return { $or: [{ name: rx }, { tags: rx }] };
  };

  // 1) Strict: require ALL terms (so "marinara sauce" won't match "applesauce").
  let docs = await Product.find({ ...base, $and: terms.map(perTerm) }).limit(limit).lean();

  // 2) Fallback: if nothing matched all terms, accept any single term.
  if (!docs.length) {
    const rx = new RegExp(terms.map(escapeRegex).join('|'), 'i');
    docs = await Product.find({ ...base, $or: [{ name: rx }, { tags: rx }] }).limit(limit).lean();
  }

  return docs.map(toApi);
}

module.exports = { getProducts, searchProducts };
