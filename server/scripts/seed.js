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

// --- map the scraped/enriched data into our Product/Store schema ------------

// store id = retailer slug ("target","walmart","publix") so product.store matches.
function mapProduct(p) {
  return {
    _id: p.id,
    name: p.name,
    store: (p.retailer || '').toLowerCase(),
    price: p.price ?? null,
    unit: p.sizeText,
    tags: p.searchTags || [],
    raw: p, // keep the full original (openFoodFacts, unitPrice, upc, category, ...)
  };
}

function mapStore(s) {
  const zip5 = String(s.zipCode || '').split('-')[0];
  return {
    _id: (s.retailer || '').toLowerCase(),
    name: s.storeName || s.retailer,
    location: [s.address, s.city, s.state].filter(Boolean).join(', '),
    zipcodes: zip5 ? [zip5] : [],
    raw: s,
  };
}

// dedupe by _id so a duplicate id in the source can't crash insertMany
function dedupeById(docs) {
  const seen = new Map();
  for (const d of docs) seen.set(d._id, d);
  return [...seen.values()];
}

async function seed() {
  await connectDB();

  const products = dedupeById((await loadJson('products.json')).map(mapProduct));
  const stores = dedupeById((await loadJson('stores.json')).map(mapStore));

  await Product.deleteMany({});
  await Store.deleteMany({});
  await Product.insertMany(products);
  await Store.insertMany(stores);

  console.log(`Seeded ${products.length} products and ${stores.length} stores`);
  console.log('Stores:', stores.map((s) => `${s._id} (zip ${s.zipcodes.join(',')})`).join(' | '));
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
