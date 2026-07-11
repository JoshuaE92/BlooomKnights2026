const { readFile } = require('node:fs/promises');
const path = require('node:path');
const mongoose = require('mongoose');

const connectDB = require('../config/db');
const Product = require('../models/Product');
const Store = require('../models/Store');

async function loadJson(fileName) {
  const raw = await readFile(path.join(__dirname, '..', 'data', fileName), 'utf-8');
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

  console.log(`Seeded ${productDocs.length} products and ${storeDocs.length} stores`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
