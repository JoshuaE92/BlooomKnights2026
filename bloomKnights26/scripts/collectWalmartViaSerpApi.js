import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiKey = process.env.SERPAPI_API_KEY;

if (!apiKey) {
  console.error("Missing SERPAPI_API_KEY. Run with: node --env-file=.env scripts/collectWalmartViaSerpApi.js");
  process.exit(1);
}

const STORE_ID = "3617";
const STORE_ID_SLUG = "walmart-32828-01";
const COLLECTED_AT = new Date().toISOString().slice(0, 10);

const QUERIES = [
  { query: "great value spaghetti 16 oz", id: "walmart-great-value-spaghetti-16oz", category: "pasta", subcategory: "spaghetti", searchTags: ["pasta", "spaghetti", "dry pasta", "store brand"] },
  { query: "great value penne pasta", id: "walmart-great-value-penne-16oz", category: "pasta", subcategory: "penne", searchTags: ["pasta", "penne", "dry pasta", "store brand"] },
  { query: "great value elbow macaroni", id: "walmart-great-value-elbow-macaroni-16oz", category: "pasta", subcategory: "elbow-macaroni", searchTags: ["pasta", "elbow macaroni", "macaroni", "store brand"] },
  { query: "great value pasta sauce marinara", id: "walmart-great-value-marinara-24oz", category: "pasta-sauce", subcategory: "marinara", searchTags: ["pasta sauce", "marinara", "tomato sauce", "store brand"] },
  { query: "great value whole milk 1 gallon", id: "walmart-great-value-whole-milk-1gal", category: "milk", subcategory: "whole-milk", searchTags: ["milk", "whole milk", "store brand"] },
  { query: "great value 2% milk 1 gallon", id: "walmart-great-value-2pct-milk-1gal", category: "milk", subcategory: "reduced-fat-milk", searchTags: ["milk", "2% milk", "store brand"] },
  { query: "great value large eggs 12 count", id: "walmart-great-value-eggs-12ct", category: "eggs", subcategory: "large-eggs", searchTags: ["eggs", "large eggs", "dozen eggs", "store brand"] },
  { query: "great value white bread", id: "walmart-great-value-white-bread", category: "bread", subcategory: "white-bread", searchTags: ["bread", "white bread", "sandwich bread", "store brand"] },
  { query: "great value long grain white rice", id: "walmart-great-value-white-rice", category: "rice", subcategory: "long-grain-white-rice", searchTags: ["rice", "white rice", "long grain rice", "store brand"] },
  { query: "great value shredded sharp cheddar cheese 8 oz", id: "walmart-great-value-sharp-cheddar-shredded-8oz", category: "cheese", subcategory: "shredded-cheddar", searchTags: ["cheese", "cheddar cheese", "shredded cheese", "store brand"] },
  { query: "great value black beans canned", id: "walmart-great-value-black-beans", category: "beans", subcategory: "black-beans", searchTags: ["beans", "black beans", "canned beans", "store brand"] },
  { query: "great value cheerios toasted oat cereal", id: "walmart-great-value-toasted-oats-cereal", category: "cereal", subcategory: "toasted-oat-cereal", searchTags: ["cereal", "breakfast cereal", "toasted oats", "store brand"] },
  { query: "honey nut cheerios cereal", id: "walmart-honey-nut-cheerios", category: "cereal", subcategory: "honey-nut-cereal", searchTags: ["cereal", "breakfast cereal", "cheerios", "honey nut cheerios"] },
  { query: "great value plain greek yogurt", id: "walmart-great-value-greek-yogurt-32oz", category: "yogurt", subcategory: "greek-yogurt", searchTags: ["yogurt", "greek yogurt", "plain yogurt", "store brand"] },
  { query: "great value salted butter 1 lb", id: "walmart-great-value-salted-butter-16oz", category: "cheese", subcategory: "butter", searchTags: ["butter", "salted butter", "store brand"] },
  { query: "great value sour cream 16 oz", id: "walmart-great-value-sour-cream-16oz", category: "cheese", subcategory: "sour-cream", searchTags: ["sour cream", "dairy", "store brand"] },
  { query: "great value creamy peanut butter", id: "walmart-great-value-peanut-butter-16oz", category: "pantry", subcategory: "peanut-butter", searchTags: ["peanut butter", "creamy peanut butter", "spread", "store brand"] },
  { query: "great value diced tomatoes 14.5 oz", id: "walmart-great-value-diced-tomatoes-14-5oz", category: "vegetables", subcategory: "canned-tomatoes", searchTags: ["tomatoes", "diced tomatoes", "canned tomatoes", "store brand"] },
  { query: "great value frozen broccoli florets", id: "walmart-great-value-broccoli-florets-frozen", category: "vegetables", subcategory: "frozen-broccoli", searchTags: ["vegetables", "broccoli", "frozen vegetables", "store brand"] },
  { query: "great value whole kernel corn canned", id: "walmart-great-value-whole-kernel-corn", category: "vegetables", subcategory: "canned-corn", searchTags: ["corn", "canned corn", "whole kernel corn", "store brand"] },
  { query: "great value all purpose flour", id: "walmart-great-value-all-purpose-flour", category: "pantry", subcategory: "flour", searchTags: ["flour", "all purpose flour", "baking", "store brand"] },
  { query: "great value granulated sugar", id: "walmart-great-value-granulated-sugar", category: "pantry", subcategory: "baking", searchTags: ["sugar", "granulated sugar", "baking", "store brand"] },
  { query: "great value vegetable oil", id: "walmart-great-value-vegetable-oil", category: "pantry", subcategory: "cooking-oil", searchTags: ["cooking oil", "vegetable oil", "store brand"] },
  { query: "great value tomato ketchup", id: "walmart-great-value-ketchup", category: "pantry", subcategory: "condiments", searchTags: ["ketchup", "condiments", "store brand"] },
  { query: "great value tortilla chips restaurant style", id: "walmart-great-value-tortilla-chips", category: "pantry", subcategory: "tortilla-chips", searchTags: ["tortilla chips", "chips", "snacks", "store brand"] },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseSize(title) {
  const patterns = [
    { re: /(\d+(?:\.\d+)?)\s*fl\s*oz/i, unit: "fl oz" },
    { re: /(\d+(?:\.\d+)?)\s*oz/i, unit: "oz" },
    { re: /(\d+(?:\.\d+)?)\s*lb/i, unit: "lb" },
    { re: /(\d+(?:\.\d+)?)\s*gal/i, unit: "gal" },
    { re: /(\d+(?:\.\d+)?)\s*ct\b/i, unit: "count" },
    { re: /(\d+(?:\.\d+)?)\s*count/i, unit: "count" },
    // Bare "Gallon" with no leading number implies a single unit (e.g. "Milk, Gallon").
    { re: /\bgallon\b/i, unit: "gal", implicitValue: 1 },
  ];
  for (const { re, unit, implicitValue } of patterns) {
    const m = title.match(re);
    if (m) return { value: implicitValue ?? parseFloat(m[1]), unit, text: m[0] };
  }
  return { value: null, unit: null, text: null };
}

function normalizeSize(value, unit) {
  if (value == null) return { sizeValue: null, sizeUnit: null };
  if (unit === "lb") return { sizeValue: value * 16, sizeUnit: "oz" };
  if (unit === "gal") return { sizeValue: value * 128, sizeUnit: "fl oz" };
  return { sizeValue: value, sizeUnit: unit };
}

async function fetchWalmart(query) {
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "walmart");
  url.searchParams.set("query", query);
  url.searchParams.set("store_id", STORE_ID);
  url.searchParams.set("api_key", apiKey);
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  const location = data.search_information?.location;
  if (location?.store_id !== STORE_ID) {
    throw new Error(`Store mismatch: expected ${STORE_ID}, got ${JSON.stringify(location)}`);
  }
  return data.organic_results ?? [];
}

const results = [];
const skipped = [];

for (const entry of QUERIES) {
  process.stdout.write(`Fetching "${entry.query}"... `);
  try {
    const items = await fetchWalmart(entry.query);
    const top = items.find((i) => !i.sponsored) ?? items[0];

    if (!top) {
      console.log("NO RESULTS - skipped");
      skipped.push({ ...entry, reason: "no results" });
      await sleep(500);
      continue;
    }

    const { value, unit, text } = parseSize(top.title);
    const { sizeValue, sizeUnit } = normalizeSize(value, unit);
    const price = top.primary_offer?.offer_price ?? null;
    const unitPrice = price != null && sizeValue ? Number((price / sizeValue).toFixed(6)) : null;

    results.push({
      id: entry.id,
      retailer: "Walmart",
      storeId: STORE_ID_SLUG,
      name: top.title,
      brand: top.title.split(",")[0].split(" ").slice(0, 2).join(" "),
      category: entry.category,
      subcategory: entry.subcategory,
      searchTags: entry.searchTags,
      price,
      currency: "USD",
      sizeText: text,
      sizeValue,
      sizeUnit,
      unitPrice,
      unitPriceUnit: sizeUnit,
      upc: null,
      availability: top.out_of_stock ? "out of stock" : "in stock",
      imageUrl: top.thumbnail ?? null,
      productUrl: top.product_page_url ?? null,
      priceCollectedAt: COLLECTED_AT,
      source: {
        type: "third-party-api",
        retailer: "Walmart",
        url: top.product_page_url ?? null,
      },
      notes: `Collected via SerpApi Walmart engine (store_id=${STORE_ID}, confirmed resolved to zip 32828 / Alafaya FL). Walmart item ID: ${top.us_item_id ?? "unknown"}. Not a UPC. Brand field is a best-effort guess parsed from the title, not independently confirmed.`,
    });
    console.log(`OK - $${price} - ${top.title}`);
  } catch (err) {
    console.log(`ERROR - ${err.message}`);
    skipped.push({ ...entry, reason: err.message });
  }
  await sleep(500);
}

const outPath = path.join(__dirname, "../src/data/walmart-collected.json");
writeFileSync(outPath, JSON.stringify(results, null, 2));

console.log(`\nCollected ${results.length} products, skipped ${skipped.length}.`);
console.log(`Written to ${outPath}`);
if (skipped.length) {
  console.log("\nSkipped:");
  for (const s of skipped) console.log(`  - ${s.query}: ${s.reason}`);
}
