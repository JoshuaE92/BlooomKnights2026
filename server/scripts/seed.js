import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { connectDB, disconnectDB } from '../config/db.js';
import Product from '../models/Product.js';
import Store from '../models/Store.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function loadJson(fileName) {
  const raw = await readFile(join(__dirname, '..', 'data', fileName), 'utf-8');
  return JSON.parse(raw);
}

// Loads the mock JSON into MongoDB. Run with: npm run seed
// Safe to re-run — it wipes and re-inserts each time (idempotent for a demo).
async function seed() {
  await connectDB();

  const products = await loadJson('products.json');
  const stores = await loadJson('stores.json');

  // Map the contract's `id` field onto Mongo's `_id`.
  const productDocs = products.map(({ id, ...rest }) => ({ _id: id, ...rest }));
  const storeDocs = stores.map(({ id, ...rest }) => ({ _id: id, ...rest }));

  await Product.deleteMany({});
  await Store.deleteMany({});
  await Product.insertMany(productDocs);
  await Store.insertMany(storeDocs);

  console.log(`🌱 Seeded ${productDocs.length} products and ${storeDocs.length} stores`);
  await disconnectDB();
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
