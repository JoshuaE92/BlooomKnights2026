import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiKey = process.env.SERPAPI_API_KEY;

if (!apiKey) {
  console.error("Missing SERPAPI_API_KEY. Run with: node --env-file=.env scripts/backfillWalmartUpc.js");
  process.exit(1);
}

const productsPath = path.join(__dirname, "../src/data/products.json");
const products = JSON.parse(readFileSync(productsPath, "utf-8"));

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchUpc(itemId) {
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "walmart_product");
  url.searchParams.set("product_id", itemId);
  url.searchParams.set("api_key", apiKey);
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.product_result?.upc ?? null;
}

let updated = 0;
let notFound = 0;
let errored = 0;

for (const p of products) {
  if (p.retailer !== "Walmart") continue;

  const match = p.notes?.match(/Walmart item ID: (\d+)/);
  if (!match) continue;
  const itemId = match[1];

  process.stdout.write(`${p.id} (item ${itemId})... `);
  try {
    const upc = await fetchUpc(itemId);
    if (upc) {
      p.upc = upc;
      updated++;
      console.log(`UPC ${upc}`);
    } else {
      notFound++;
      console.log("no UPC in response");
    }
  } catch (err) {
    errored++;
    console.log(`ERROR - ${err.message}`);
  }
  await sleep(500);
}

writeFileSync(productsPath, JSON.stringify(products, null, 2) + "\n");

console.log(`\nUpdated ${updated}, no UPC found ${notFound}, errors ${errored}.`);
