import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiKey = process.env.SERPAPI_API_KEY;

if (!apiKey) {
  console.error("Missing SERPAPI_API_KEY. Run with: node --env-file=.env scripts/collectWalmartBatch2.js");
  process.exit(1);
}

const STORE_ID = "3617";
const STORE_ID_SLUG = "walmart-32828-01";
const COLLECTED_AT = new Date().toISOString().slice(0, 10);

const QUERIES = [
  { query: "great value mild salsa 16 oz", id: "walmart-great-value-mild-salsa-16oz", category: "pantry", subcategory: "salsa", searchTags: ["salsa", "mild salsa", "dip", "store brand"] },
  { query: "great value chunk light tuna", id: "walmart-great-value-chunk-light-tuna", category: "pantry", subcategory: "canned-tuna", searchTags: ["tuna", "canned tuna", "chunk light tuna", "store brand"] },
  { query: "great value mini pretzels", id: "walmart-great-value-pretzels", category: "pantry", subcategory: "pretzels", searchTags: ["pretzels", "snacks", "store brand"] },
  { query: "great value grape jelly", id: "walmart-great-value-grape-jelly", category: "pantry", subcategory: "jam-jelly", searchTags: ["jelly", "grape jelly", "spread", "store brand"] },
  { query: "great value macaroni and cheese dinner", id: "walmart-great-value-mac-and-cheese", category: "pasta", subcategory: "boxed-mac-and-cheese", searchTags: ["mac and cheese", "macaroni and cheese", "boxed dinner", "store brand"] },
  { query: "great value ground coffee medium roast", id: "walmart-great-value-ground-coffee", category: "coffee", subcategory: "ground-coffee", searchTags: ["coffee", "ground coffee", "medium roast", "store brand"] },
  { query: "great value orange juice", id: "walmart-great-value-orange-juice", category: "juice", subcategory: "orange-juice", searchTags: ["orange juice", "juice", "100% juice", "store brand"] },
  { query: "great value frozen mixed berries", id: "walmart-great-value-frozen-mixed-berries", category: "vegetables", subcategory: "frozen-fruit", searchTags: ["berries", "frozen fruit", "mixed berries", "smoothie", "store brand"] },
  { query: "great value applesauce cups", id: "walmart-great-value-applesauce-cups", category: "pantry", subcategory: "applesauce", searchTags: ["applesauce", "fruit cups", "snack", "store brand"] },
  { query: "great value old fashioned oats", id: "walmart-great-value-old-fashioned-oats", category: "cereal", subcategory: "oats", searchTags: ["oats", "oatmeal", "old fashioned oats", "store brand"] },
  { query: "great value mozzarella string cheese", id: "walmart-great-value-string-cheese", category: "cheese", subcategory: "string-cheese", searchTags: ["cheese", "mozzarella", "string cheese", "snack cheese", "store brand"] },
  { query: "great value american cheese slices", id: "walmart-great-value-american-cheese-slices", category: "cheese", subcategory: "american-cheese", searchTags: ["cheese", "american cheese", "sliced cheese", "sandwich cheese", "store brand"] },
  { query: "great value mayonnaise", id: "walmart-great-value-mayonnaise", category: "pantry", subcategory: "condiments", searchTags: ["mayonnaise", "mayo", "condiments", "store brand"] },
  { query: "great value yellow mustard", id: "walmart-great-value-yellow-mustard", category: "pantry", subcategory: "condiments", searchTags: ["mustard", "yellow mustard", "condiments", "store brand"] },
  { query: "great value chicken noodle soup", id: "walmart-great-value-chicken-noodle-soup", category: "pantry", subcategory: "canned-soup", searchTags: ["soup", "chicken noodle soup", "canned soup", "store brand"] },
  { query: "great value frozen chicken breast boneless skinless", id: "walmart-great-value-chicken-breast-frozen", category: "chicken", subcategory: "chicken-breast", searchTags: ["chicken", "chicken breast", "boneless skinless chicken", "frozen chicken", "store brand"] },
  { query: "great value 80/20 ground beef", id: "walmart-great-value-ground-beef-80-20", category: "chicken", subcategory: "ground-beef", searchTags: ["ground beef", "beef", "hamburger meat", "80/20 ground beef", "store brand"] },
  { query: "great value fresh baby spinach", id: "walmart-great-value-baby-spinach", category: "vegetables", subcategory: "fresh-spinach", searchTags: ["spinach", "baby spinach", "fresh vegetables", "store brand"] },
  { query: "great value frozen cheese pizza", id: "walmart-great-value-frozen-pizza", category: "pantry", subcategory: "frozen-pizza", searchTags: ["pizza", "frozen pizza", "cheese pizza", "store brand"] },
  { query: "great value granola bars", id: "walmart-great-value-granola-bars", category: "pantry", subcategory: "granola-bars", searchTags: ["granola bars", "snack bars", "store brand"] },
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

const outPath = path.join(__dirname, "../src/data/walmart-batch2.json");
writeFileSync(outPath, JSON.stringify(results, null, 2));

console.log(`\nCollected ${results.length} products, skipped ${skipped.length}.`);
console.log(`Written to ${outPath}`);
if (skipped.length) {
  console.log("\nSkipped:");
  for (const s of skipped) console.log(`  - ${s.query}: ${s.reason}`);
}
