import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const products = JSON.parse(
  readFileSync(path.join(__dirname, "../src/data/products.json"), "utf-8")
);
const stores = JSON.parse(
  readFileSync(path.join(__dirname, "../src/data/stores.json"), "utf-8")
);

const REQUIRED_FIELDS = [
  "id",
  "retailer",
  "storeId",
  "name",
  "brand",
  "category",
  "searchTags",
  "price",
  "currency",
  "sizeText",
  "sizeValue",
  "sizeUnit",
  "productUrl",
  "priceCollectedAt",
  "source",
];

const NORMALIZED_CATEGORIES = new Set([
  "pasta",
  "pasta-sauce",
  "milk",
  "milk-alternative",
  "cereal",
  "bread",
  "rice",
  "eggs",
  "cheese",
  "beans",
  "chicken",
  "vegetables",
  "yogurt",
  "pantry",
  "coffee",
  "juice",
]);

const storeIds = new Set(stores.map((s) => s.storeId));
const isoDateRe = /^\d{4}-\d{2}-\d{2}$/;

let errors = 0;
let warnings = 0;
const categoryCount = {};
const retailerCount = {};
let missingUpc = 0;
let missingImage = 0;
let missingUnitPrice = 0;
const seenIds = new Set();

for (const p of products) {
  const label = p.id ?? "<no id>";

  for (const field of REQUIRED_FIELDS) {
    if (p[field] === undefined) {
      console.error(`ERROR [${label}]: missing required field "${field}"`);
      errors++;
    }
  }

  if (p.id) {
    if (seenIds.has(p.id)) {
      console.error(`ERROR [${label}]: duplicate product id`);
      errors++;
    }
    seenIds.add(p.id);
  }

  const isPlaceholder = p.price === null;

  if (!isPlaceholder) {
    if (typeof p.price !== "number" || p.price <= 0) {
      console.error(`ERROR [${label}]: price must be a positive number`);
      errors++;
    }

    if (p.sizeValue !== null && typeof p.sizeValue !== "number") {
      console.error(`ERROR [${label}]: sizeValue must be numeric or null`);
      errors++;
    }

    if (p.sizeValue !== null && p.sizeValue > 0 && p.unitPrice !== null) {
      const expected = p.price / p.sizeValue;
      if (Math.abs(expected - p.unitPrice) > 0.001) {
        console.error(
          `ERROR [${label}]: unitPrice ${p.unitPrice} does not match price/sizeValue (${expected.toFixed(5)})`
        );
        errors++;
      }
    }

    if (typeof p.productUrl !== "string" || !p.productUrl.startsWith("http")) {
      console.error(`ERROR [${label}]: productUrl must be a valid URL string`);
      errors++;
    }

    if (!isoDateRe.test(p.priceCollectedAt ?? "")) {
      console.error(`ERROR [${label}]: priceCollectedAt must be an ISO date (YYYY-MM-DD)`);
      errors++;
    }
  }

  if (!storeIds.has(p.storeId)) {
    console.error(`ERROR [${label}]: storeId "${p.storeId}" not found in stores.json`);
    errors++;
  }

  if (!NORMALIZED_CATEGORIES.has(p.category)) {
    console.error(`ERROR [${label}]: category "${p.category}" is not normalized`);
    errors++;
  }

  if (!Array.isArray(p.searchTags)) {
    console.error(`ERROR [${label}]: searchTags must be an array`);
    errors++;
  }

  if (p.upc !== null && p.upc !== undefined && !/^\d+$/.test(p.upc)) {
    console.error(`ERROR [${label}]: upc must contain only digits or be null`);
    errors++;
  }

  if (!p.upc) {
    console.warn(`WARNING [${label}]: missing UPC`);
    warnings++;
    missingUpc++;
  }

  if (!p.imageUrl) {
    console.warn(`WARNING [${label}]: missing image`);
    warnings++;
    missingImage++;
  }

  if (p.availability === null || p.availability === undefined) {
    console.warn(`WARNING [${label}]: missing availability`);
    warnings++;
  }

  if (!isPlaceholder && p.unitPrice === null) {
    console.warn(`WARNING [${label}]: unit price could not be calculated`);
    warnings++;
    missingUnitPrice++;
  }

  retailerCount[p.retailer] = (retailerCount[p.retailer] ?? 0) + 1;
  categoryCount[p.category] = (categoryCount[p.category] ?? 0) + 1;
}

console.log("\n--- Validation Summary ---");
console.log(`Products checked: ${products.length}`);
console.log(`Valid products: ${products.length - errors}`);
console.log(`Warnings: ${warnings}`);
console.log(`Errors: ${errors}`);

console.log("\n--- Products per retailer ---");
for (const [retailer, count] of Object.entries(retailerCount)) {
  console.log(`${retailer}: ${count}`);
}

console.log("\n--- Products per category ---");
for (const [category, count] of Object.entries(categoryCount)) {
  console.log(`${category}: ${count}`);
}

console.log("\n--- Data quality gaps ---");
console.log(`Missing UPC: ${missingUpc}`);
console.log(`Missing image: ${missingImage}`);
console.log(`Missing calculable unit price: ${missingUnitPrice}`);

if (errors > 0) {
  process.exitCode = 1;
}
