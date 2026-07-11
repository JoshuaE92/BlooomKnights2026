const { readFile } = require('node:fs/promises');
const path = require('node:path');

const DATA_PATH = path.join(__dirname, '..', 'data', 'products.json');

async function loadCatalog() {
  const raw = await readFile(DATA_PATH, 'utf-8');
  return JSON.parse(raw);
}

// THE SWAP POINT.
// Today: reads mock products.json. Tomorrow: a real store API or scraper.
// As long as these return the same product shape, nothing else changes.

// Get every product for the given stores (used by the /api/products endpoint).
// Mongo later: Product.find({ store: { $in: stores } })
async function getProducts({ stores } = {}) {
  const catalog = await loadCatalog();
  if (!stores || stores.length === 0) return catalog;

  const wanted = new Set(stores.map((s) => s.toLowerCase()));
  return catalog.filter((p) => wanted.has(p.store.toLowerCase()));
}

// Search the stores for products matching one needed item (e.g. "corn tortillas").
// This is the per-item query in the two-phase AI flow: instead of dumping the
// whole catalog at the AI, we narrow to a handful of relevant candidates here.
//
// Mongo later: Product.find({ store: { $in: stores }, $text: { $search: query } })
async function searchProducts({ stores, query, limit = 10 } = {}) {
  const catalog = await loadCatalog();
  const wanted = stores && stores.length ? new Set(stores.map((s) => s.toLowerCase())) : null;

  // Break "corn tortillas" -> ["corn","tortillas"]; a product matches if any
  // meaningful term appears in its name or tags.
  const terms = (query || '')
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length > 2);

  return catalog
    .filter((p) => {
      if (wanted && !wanted.has(p.store.toLowerCase())) return false;
      if (!terms.length) return true;
      const haystack = `${p.name} ${p.tags.join(' ')}`.toLowerCase();
      return terms.some((t) => haystack.includes(t));
    })
    .slice(0, limit);
}

module.exports = { getProducts, searchProducts };
