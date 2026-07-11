import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const productsPath = path.join(__dirname, "../src/data/products.json");
const products = JSON.parse(readFileSync(productsPath, "utf-8"));

// Conservative pacing: OFF documents 15 req/min for barcode lookups.
// We run at 5 req/min (one call every 12s) to stay well clear of the limit.
const MS_BETWEEN_CALLS = 12_000;
const USER_AGENT = "BloomKnights-Hackathon-Prototype/1.0 (+https://github.com/JoshuaE92/BlooomKnights2026)";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchByUpc(upc) {
  const url = `https://world.openfoodfacts.org/api/v2/product/${upc}.json`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (res.status === 503) throw new Error("rate limited (503)");
  const data = await res.json();
  if (data.status !== 1 || !data.product) return null;
  return data.product;
}

function buildEnrichmentRecord(offProduct, matchMethod, matchConfidence) {
  const p = offProduct;
  return {
    matched: true,
    matchMethod,
    matchConfidence,
    barcode: p.code ?? null,
    nutrition: {
      nutriScoreGrade: p.nutriscore_grade ?? null,
      novaGroup: p.nova_group ?? null,
      nutrients: {
        energyKcal100g: p.nutriments?.["energy-kcal_100g"] ?? null,
        fat100g: p.nutriments?.["fat_100g"] ?? null,
        saturatedFat100g: p.nutriments?.["saturated-fat_100g"] ?? null,
        sugars100g: p.nutriments?.["sugars_100g"] ?? null,
        salt100g: p.nutriments?.["salt_100g"] ?? null,
        proteins100g: p.nutriments?.["proteins_100g"] ?? null,
        fiber100g: p.nutriments?.["fiber_100g"] ?? null,
      },
    },
    environment: {
      score: p.ecoscore_score ?? null,
      grade: p.ecoscore_grade && p.ecoscore_grade !== "unknown" ? p.ecoscore_grade : null,
      packagingTags: p.packaging_tags ?? [],
      labels: p.labels_tags ?? [],
    },
  };
}

const NO_MATCH = {
  matched: false,
  matchMethod: null,
  matchConfidence: "low",
};

async function run() {
  const targets = products.filter((p) => p.upc);
  console.log(`Found ${targets.length} products with a UPC to enrich.`);
  console.log(`Pacing at 1 request per ${MS_BETWEEN_CALLS / 1000}s (~${Math.round(60_000 / MS_BETWEEN_CALLS)} req/min).`);
  console.log(`Estimated time: ~${Math.ceil((targets.length * MS_BETWEEN_CALLS) / 60_000)} minutes.\n`);

  let matched = 0;
  let notFound = 0;
  let errored = 0;

  for (let i = 0; i < targets.length; i++) {
    const p = targets[i];
    process.stdout.write(`[${i + 1}/${targets.length}] ${p.id} (upc ${p.upc})... `);

    try {
      const offProduct = await fetchByUpc(p.upc);
      if (offProduct) {
        p.openFoodFacts = buildEnrichmentRecord(offProduct, "upc", "high");
        matched++;
        console.log(`MATCHED - "${offProduct.product_name ?? "(no name)"}" - nutriscore=${offProduct.nutriscore_grade ?? "?"}`);
      } else {
        p.openFoodFacts = NO_MATCH;
        notFound++;
        console.log("no match");
      }
    } catch (err) {
      p.openFoodFacts = NO_MATCH;
      errored++;
      console.log(`ERROR - ${err.message}`);
      if (err.message.includes("rate limited")) {
        console.log("Rate limited - backing off for 60s before continuing...");
        await sleep(60_000);
      }
    }

    if (i < targets.length - 1) await sleep(MS_BETWEEN_CALLS);
  }

  writeFileSync(productsPath, JSON.stringify(products, null, 2) + "\n");

  console.log(`\nDone. Matched ${matched}, not found ${notFound}, errors ${errored}.`);
  console.log(`Products without a UPC were left untouched by this script (${products.length - targets.length} remaining).`);
}

run();
