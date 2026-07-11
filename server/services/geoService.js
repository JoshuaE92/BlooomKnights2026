import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, '..', 'data', 'stores.json');

async function loadStores() {
  const raw = await readFile(DATA_PATH, 'utf-8');
  return JSON.parse(raw);
}

// Another swap point (like externalProductAPI): today this matches a zip
// against each store's served-zipcode list. Later it could call a real
// geo/store-locator API — callers only depend on the return shape.
//
// Contract: resolves to an array of stores that serve the given zipcode.
// No zip -> return all stores.
export async function getStoresForZip(zip) {
  const stores = await loadStores();
  if (!zip) return stores;
  return stores.filter((s) => s.zipcodes.includes(String(zip)));
}
