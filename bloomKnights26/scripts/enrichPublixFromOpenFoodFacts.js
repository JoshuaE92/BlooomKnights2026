import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const productsPath = path.join(__dirname, "../src/data/products.json");
const products = JSON.parse(readFileSync(productsPath, "utf-8"));

// OFF documents 10 req/min for search endpoints, but we observed 503s at
// 6/min in practice, so we run more conservatively at 4/min (one call
// every 15s).
const MS_BETWEEN_CALLS = 15_000;
const USER_AGENT = "BloomKnights-Hackathon-Prototype/1.0 (+https://github.com/JoshuaE92/BlooomKnights2026)";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Products whose OFF data can be safely reused from an already-matched
// national-brand record collected at another retailer: same brand, same
// product name, same package size. NOT used for store-brand products,
// since "Publix Spaghetti" is a genuinely different product from "Barilla
// Spaghetti" even though both are spaghetti.
const REUSE_MAP = {
  "target-barilla-spaghetti-16oz-publix": "target-barilla-spaghetti-16oz",
  "publix-honey-nut-cheerios-10-8oz": "target-honey-nut-cheerios-10-8oz",
  "publix-folgers-classic-roast-25-9oz": "target-folgers-classic-medium-roast-coffee-25-9oz",
};

function normalize(s) {
  return (s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

// Modifiers that change what a product actually is even when the base noun
// matches (e.g. "Thin Spaghetti" vs "Spaghetti", "Reduced Fat" vs regular).
// If one of these appears on only one side of the comparison, the match is
// rejected even though generic word overlap would otherwise pass it.
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

// Reject a search result if its brand/name don't plausibly relate to what
// we searched for. This is a coarse guard, not a guarantee of correctness -
// its purpose is to catch obviously-wrong matches (different category,
// unrelated brand, or a same-category-but-different-variant product like
// "Thin Spaghetti" standing in for "Spaghetti").
function passesSanityCheck(offProduct, publixProduct) {
  const offName = normalize(offProduct.product_name);
  const offBrand = normalize(offProduct.brands);
  const wantName = normalize(publixProduct.name.replace(/^publix\s+/i, ""));
  const wantBrand = normalize(publixProduct.brand);

  if (!offName) return false;

  // At least one significant word from our product name/subcategory should
  // appear in OFF's product name (e.g. "spaghetti", "cheddar", "ketchup").
  const wantWords = [...new Set([...wantName.split(" "), ...normalize(publixProduct.subcategory).split(" ")])]
    .filter((w) => w.length > 3);
  const nameOverlap = wantWords.some((w) => offName.includes(w));

  // If Publix's brand isn't the generic store name, require some brand
  // overlap too (helps catch e.g. "Rold Gold" matching an unrelated snack).
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
    // Audit fields (not in the original project schema): retained so match
    // correctness can be spot-checked after the fact, since automated
    // sanity checks are coarse and can still let a wrong match through.
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
  const publix = products.filter((p) => p.retailer === "Publix" && !p.upc);
  console.log(`Found ${publix.length} Publix products without a UPC.\n`);

  let reused = 0;
  let searched = 0;
  let matched = 0;
  let rejected = 0;
  let notFound = 0;
  let errored = 0;

  for (let i = 0; i < publix.length; i++) {
    const p = publix[i];
    process.stdout.write(`[${i + 1}/${publix.length}] ${p.id}... `);

    // Tier 1: reuse a verified same-brand/name/size match already cached
    // from Target or Walmart.
    if (REUSE_MAP[p.id]) {
      const source = products.find((x) => x.id === REUSE_MAP[p.id]);
      if (source?.openFoodFacts?.matched) {
        p.openFoodFacts = {
          ...source.openFoodFacts,
          matchMethod: "brand-name-reuse",
          matchConfidence: "medium",
        };
        reused++;
        console.log(`REUSED from ${source.id} - "${source.openFoodFacts.nutrition.nutriScoreGrade ?? "?"}"`);
        continue;
      }
    }

    // Tier 2: real name-search against OFF, paced under the search rate limit.
    searched++;
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
      p.openFoodFacts = NO_MATCH;
      errored++;
      console.log(`ERROR - ${err.message}`);
      if (err.message.includes("rate limited")) {
        console.log("Rate limited - backing off for 60s before continuing...");
        await sleep(60_000);
      }
    }

    if (i < publix.length - 1) await sleep(MS_BETWEEN_CALLS);
  }

  writeFileSync(productsPath, JSON.stringify(products, null, 2) + "\n");

  console.log(`\nDone.`);
  console.log(`Reused (national brand, cached): ${reused}`);
  console.log(`Searched: ${searched} -> matched ${matched}, rejected by sanity check ${rejected}, no results ${notFound}, errors ${errored}`);
}

run();
