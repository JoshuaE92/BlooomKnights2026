const apiKey = process.env.SERPAPI_API_KEY;

if (!apiKey) {
  console.error("Missing SERPAPI_API_KEY. Set it in .env (see .env.example) and run with:");
  console.error("  node --env-file=.env scripts/testSerpApiWalmart.js");
  process.exit(1);
}

const query = process.argv[2] ?? "great value spaghetti";
const storeId = process.argv[3] ?? "3617";

const url = new URL("https://serpapi.com/search.json");
url.searchParams.set("engine", "walmart");
url.searchParams.set("query", query);
url.searchParams.set("store_id", storeId);
url.searchParams.set("api_key", apiKey);

console.log(`Querying SerpApi Walmart engine for "${query}" at store_id ${storeId}...`);

const res = await fetch(url);
const data = await res.json();

if (data.error) {
  console.error("SerpApi returned an error:", data.error);
  process.exit(1);
}

const results = data.organic_results ?? [];
console.log(`Got ${results.length} organic result(s).\n`);

console.log("resolved location:", JSON.stringify(data.search_information?.location), "\n");

for (const item of results.slice(0, 5)) {
  console.log("----------------------------------------");
  console.log("title:        ", item.title);
  console.log("price:        ", item.primary_offer?.offer_price ?? item.price ?? null);
  console.log("price_per_unit:", item.price_per_unit ?? null);
  console.log("out_of_stock: ", item.out_of_stock ?? null);
  console.log("us_item_id:   ", item.us_item_id ?? null);
  console.log("link:         ", item.product_page_url ?? item.link ?? null);
  console.log("thumbnail:    ", item.thumbnail ?? null);
}

if (results.length === 0) {
  console.log("Raw response keys:", Object.keys(data));
}