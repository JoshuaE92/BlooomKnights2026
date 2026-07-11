import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, '..', 'data', 'products.json');

async function loadCatalog() {
  const raw = await readFile(DATA_PATH, 'utf-8');
  return JSON.parse(raw);
}

// THE SWAP POINT.
// Today: reads mock products.json.
// Tomorrow: hit a real store API, or run a web scraper.
// As long as this returns the same product shape, nothing else changes.
//
// Contract: resolves to an array of products. Pass { stores } to filter to
// only the stores the user selected; omit it to get the whole catalog.
export async function getProducts({ stores } = {}) {
  const catalog = await loadCatalog();
  if (!stores || stores.length === 0) return catalog;

  const wanted = new Set(stores.map((s) => s.toLowerCase()));
  return catalog.filter((p) => wanted.has(p.store.toLowerCase()));
}
