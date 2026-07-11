import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const productsPath = path.join(__dirname, "../src/data/products.json");
const products = JSON.parse(readFileSync(productsPath, "utf-8"));

// IDs that got a 503 during the previous run and were written as
// matched:false even though we never actually got a real answer from OFF.
// This script re-queries only these, so a rate-limit failure doesn't get
// silently recorded as "no match exists" - the two are not the same thing.
const RETRY_IDS = [
  "publix-elbow-macaroni-16oz",
  "publix-pasta-sauce-marinara-24oz",
  "publix-sharp-cheddar-shredded-8oz",
  "publix-baby-spinach-6oz",
  "publix-butter-salted-16oz",
  "publix-sour-cream-8oz",
  "publix-vegetable-oil-48floz",
  "publix-tortilla-chips-restaurant-style-9oz",
  "publix-old-fashioned-oats-42oz",
  "publix-salsa-mild-16oz",
  "publix-starkist-tuna-12oz",
  "publix-mac-and-cheese-7-25oz",
  "publix-orange-juice-1gal",
  "publix-mixed-berries-frozen-12oz",
];

// Much slower than the previous attempt (15s) since that still hit 503s
// repeatedly. 20s spacing = 3 req/min, well under the documented 10/min.
const MS_BETWEEN_CALLS = 20_000;
const USER_AGENT = "BloomKnights-Hackathon-Prototype/1.0 (+https://github.com/JoshuaE92/BlooomKnights2026)";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalize(s) {
  return (s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

const DISTINGUISHING_MODIFIERS = [
  "thin", "whole", "reduced", "fat free", "light", "low fat", "low sodium",
  "no salt", "unsalted", "salted", "organic", "gluten free", "sugar free",
  "unsweetened", "sweetened", "diet", "decaf", "instant", "extra", "family",
  "mini", "large", "small", "sharp", "mild", "medium", "hot", "spicy",
];

function findModifierMismatches(wantText, offText) {
  const w = normalize(wantText);
  const o = normalize(offText);
  return DISTINGUISHING_MODIFIERS.filter((mod) => w.includes(mod) !== o.includes(mod));
}

function passesSanityCheck(offProduct, publixProduct) {
  const offName = normalize(offProduct.product_name);
  const offBrand = normalize(offProduct.brands);
  const wantName = normalize(publixProduct.name.replace(/^publix\s+/i, ""));
  const wantBrand = normalize(publixProduct.brand);

  if (!offName) return false;

  const wantWords = [...new Set([...wantName.split(" "), ...normalize(publixProduct.subcategory).split(" ")])]
    .filter((w) => w.length > 3);
  const nameOverlap = wantWords.some((w) => offName.includes(w));

  const isStoreBrand = wantBrand === "publix";
  const brandOverlap = isStoreBrand || !wantBrand || offBrand.includes(wantBrand) || wantBrand.includes(offBrand);

  const modifierMismatches = findModifierMismatches(publixProduct.name, offProduct.product_name);

  return nameOverlap && brandOverlap && modifierMismatches.length === 0;
}

async function searchOff(query) {
  const url = new URL("https://world.openfoodfacts.org/cgi/search.pl");
  url.searchParams.set("search_terms", query);
  url.searchParams.set("json", "1");
  url.searchParams.set("page_size", "5");
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (res.status === 503) throw new Error("rate limited (503)");
  const data = await res.json();
  return data.products ?? [];
}

function buildEnrichmentRecord(offProduct, matchMethod, matchConfidence) {
  const p = offProduct;
  return {
    matched: true,
    matchMethod,
    matchConfidence,
    offProductName: p.product_name ?? null,
    offBrand: p.brands ?? null,
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

const NO_MATCH = { matched: false, matchMethod: null, matchConfidence: "low" };

async function run() {
  const targets = products.filter((p) => RETRY_IDS.includes(p.id));
  console.log(`Retrying ${targets.length} products that previously errored with 503.\n`);

  let matched = 0;
  let rejected = 0;
  let notFound = 0;
  let stillErrored = 0;

  for (let i = 0; i < targets.length; i++) {
    const p = targets[i];
    process.stdout.write(`[${i + 1}/${targets.length}] ${p.id}... `);

    const query = `${p.brand} ${p.name}`;
    try {
      const results = await searchOff(query);
      const candidate = results.find((r) => passesSanityCheck(r, p));
      if (candidate) {
        const isStoreBrand = normalize(p.brand) === "publix";
        p.openFoodFacts = buildEnrichmentRecord(candidate, "name", isStoreBrand ? "low" : "medium");
        matched++;
        console.log(`MATCHED - "${candidate.product_name}" (${candidate.brands})`);
      } else if (results.length > 0) {
        p.openFoodFacts = NO_MATCH;
        rejected++;
        console.log(`REJECTED - top result "${results[0].product_name}" failed sanity check`);
      } else {
        p.openFoodFacts = NO_MATCH;
        notFound++;
        console.log("no results");
      }
    } catch (err) {
      // Leave existing (incorrect) matched:false in place rather than
      // overwrite with another guess - surfaces clearly in the summary
      // below so a human knows this one still needs another pass.
      stillErrored++;
      console.log(`ERROR - ${err.message} (leaving previous state, needs another retry)`);
      if (err.message.includes("rate limited")) {
        console.log("Rate limited - backing off for 90s before continuing...");
        await sleep(90_000);
      }
    }

    if (i < targets.length - 1) await sleep(MS_BETWEEN_CALLS);
  }

  writeFileSync(productsPath, JSON.stringify(products, null, 2) + "\n");

  console.log(`\nDone. Matched ${matched}, rejected ${rejected}, no results ${notFound}, still errored ${stillErrored}.`);
}

run();
