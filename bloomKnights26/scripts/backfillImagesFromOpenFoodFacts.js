import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const productsPath = path.join(__dirname, "../src/data/products.json");
const products = JSON.parse(readFileSync(productsPath, "utf-8"));

// OFF's documented 15 req/min for product lookups proved unreliable in
// practice during earlier enrichment runs (503s well under that rate), so
// we run conservatively at 4/min (one call every 15s).
const MS_BETWEEN_CALLS = 15_000;
const USER_AGENT = "BloomKnights-Hackathon-Prototype/1.0 (+https://github.com/JoshuaE92/BlooomKnights2026)";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchImageUrl(barcode) {
  const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=image_url,image_front_url`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (res.status === 503) throw new Error("rate limited (503)");
  const data = await res.json();
  if (data.status !== 1 || !data.product) return null;
  return data.product.image_front_url ?? data.product.image_url ?? null;
}

async function run() {
  // Only backfill products that don't already have a retailer-sourced
  // image (Walmart already has real ones via SerpApi) and that have a
  // verified OFF match with a barcode to look up.
  const targets = products.filter((p) => !p.imageUrl && p.openFoodFacts?.matched && p.openFoodFacts?.barcode);
  console.log(`Found ${targets.length} products eligible for OFF image backfill.`);
  console.log(`Pacing at 1 request per ${MS_BETWEEN_CALLS / 1000}s.`);
  console.log(`Estimated time: ~${Math.ceil((targets.length * MS_BETWEEN_CALLS) / 60_000)} minutes.\n`);

  let filled = 0;
  let noImage = 0;
  let errored = 0;

  for (let i = 0; i < targets.length; i++) {
    const p = targets[i];
    process.stdout.write(`[${i + 1}/${targets.length}] ${p.id} (barcode ${p.openFoodFacts.barcode})... `);

    try {
      const imageUrl = await fetchImageUrl(p.openFoodFacts.barcode);
      if (imageUrl) {
        p.imageUrl = imageUrl;
        p.imageSource = "open-food-facts";
        filled++;
        console.log(`OK - ${imageUrl}`);
      } else {
        noImage++;
        console.log("no image available on OFF");
      }
      // Write after every successful update, not just at the end, so
      // progress survives a crash/interruption and can be spot-checked
      // (e.g. opening a real URL in a browser) while the script is still
      // running rather than only after all 94 calls finish.
      writeFileSync(productsPath, JSON.stringify(products, null, 2) + "\n");
    } catch (err) {
      errored++;
      console.log(`ERROR - ${err.message}`);
      if (err.message.includes("rate limited")) {
        console.log("Rate limited - backing off for 90s before continuing...");
        await sleep(90_000);
      }
    }

    if (i < targets.length - 1) await sleep(MS_BETWEEN_CALLS);
  }

  console.log(`\nDone. Filled ${filled}, no image on OFF ${noImage}, errors ${errored}.`);
}

run();
