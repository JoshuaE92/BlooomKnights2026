import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const productsPath = path.join(__dirname, "../src/data/products.json");
const products = JSON.parse(readFileSync(productsPath, "utf-8"));

// Same conservative pacing as the other OFF-backed enrichment scripts in
// this repo: documented limits proved unreliable in practice, so we run
// well under them (1 call per 15s = 4/min against a 15/min documented cap
// for product lookups).
const MS_BETWEEN_CALLS = 15_000;
const USER_AGENT = "GreenCart/1.0 (+https://github.com/JoshuaE92/BlooomKnights2026)";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchEcoscoreData(upc) {
  const url = `https://world.openfoodfacts.org/api/v2/product/${upc}.json?fields=ecoscore_data,ecoscore_grade,categories_tags,labels_tags,packaging`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (res.status === 429 || res.status === 503) throw new Error(`rate limited (${res.status})`);
  const data = await res.json();
  if (data.status !== 1 || !data.product) return null;
  return data.product;
}

// Extracts just the causal, per-product-useful signal from OFF's
// ecoscore_data, dropping the ~64-country transportation/scores maps
// (irrelevant for a US app) and keeping only the US-relevant numbers plus
// the itemized adjustment reasons. See docs/ecoscoreDetails-shape.md for
// the documented contract.
function extractEcoscoreDetails(offProduct) {
  const eco = offProduct.ecoscore_data;
  if (!eco) return { available: false };

  const agribalyse = eco.agribalyse?.warning
    ? null
    : {
        carbonFootprintTotal: eco.agribalyse?.co2_total ?? null,
        carbonFootprintByStage: {
          agriculture: eco.agribalyse?.co2_agriculture ?? null,
          processing: eco.agribalyse?.co2_processing ?? null,
          packaging: eco.agribalyse?.co2_packaging ?? null,
          transportation: eco.agribalyse?.co2_transportation ?? null,
          distribution: eco.agribalyse?.co2_distribution ?? null,
          consumption: eco.agribalyse?.co2_consumption ?? null,
        },
        lifeCycleScore: eco.agribalyse?.score ?? null,
        foodCategory: eco.agribalyse?.name_en ?? null,
      };

  const packagingAdj = eco.adjustments?.packaging;
  const packaging = packagingAdj
    ? {
        pointAdjustment: packagingAdj.value ?? null,
        materialScore: packagingAdj.score ?? null,
        hasNonRecyclableMaterial: (packagingAdj.non_recyclable_and_non_biodegradable_materials ?? 0) > 0,
        materials: (packagingAdj.packagings ?? [])
          .map((p) => p.material)
          .filter((m) => m && m !== "en:unknown"),
        dataAvailable: packagingAdj.warning !== "unspecified_material",
      }
    : null;

  const originsAdj = eco.adjustments?.origins_of_ingredients;
  const origins = originsAdj
    ? {
        pointAdjustment: originsAdj.value ?? null,
        // US-specific transport score, not the 64-country map.
        usTransportationScore: originsAdj.transportation_scores?.us ?? null,
        knownOrigins: (originsAdj.origins_from_categories ?? []).filter((o) => o !== "en:unknown"),
        dataAvailable: originsAdj.warning !== "origins_are_100_percent_unknown",
      }
    : null;

  const productionAdj = eco.adjustments?.production_system;
  const productionSystem = productionAdj
    ? {
        pointAdjustment: productionAdj.value ?? null,
        labels: productionAdj.labels ?? [],
        dataAvailable: productionAdj.warning !== "no_label",
      }
    : null;

  const threatenedSpecies = eco.adjustments?.threatened_species;
  const hasThreatenedSpeciesImpact = Boolean(threatenedSpecies && Object.keys(threatenedSpecies).length > 0);

  return {
    available: true,
    grade: offProduct.ecoscore_grade && offProduct.ecoscore_grade !== "unknown" ? offProduct.ecoscore_grade : null,
    agribalyse,
    adjustments: { packaging, origins, productionSystem, hasThreatenedSpeciesImpact },
  };
}

async function run() {
  // Only enrich products with a UPC that don't already carry
  // ecoscoreDetails, so re-runs are cheap (idempotent, per the task spec).
  const targets = products.filter((p) => p.upc && !p.openFoodFacts?.ecoscoreDetails);
  console.log(`Found ${targets.length} products with a UPC needing ecoscoreDetails.`);
  console.log(`Pacing at 1 request per ${MS_BETWEEN_CALLS / 1000}s.`);
  console.log(`Estimated time: ~${Math.ceil((targets.length * MS_BETWEEN_CALLS) / 60_000)} minutes.\n`);

  let enriched = 0;
  let noData = 0;
  let notFound = 0;
  let errored = 0;

  for (let i = 0; i < targets.length; i++) {
    const p = targets[i];
    process.stdout.write(`[${i + 1}/${targets.length}] ${p.id} (upc ${p.upc})... `);

    try {
      const offProduct = await fetchEcoscoreData(p.upc);
      if (offProduct) {
        const details = extractEcoscoreDetails(offProduct);
        if (!p.openFoodFacts) p.openFoodFacts = { matched: true, matchMethod: "upc", matchConfidence: "high" };
        p.openFoodFacts.ecoscoreDetails = details;
        if (details.available) {
          enriched++;
          console.log(`OK - grade=${details.grade ?? "unknown"}, agribalyse=${details.agribalyse ? "yes" : "no"}`);
        } else {
          noData++;
          console.log("no ecoscore_data on OFF");
        }
      } else {
        notFound++;
        p.openFoodFacts = p.openFoodFacts ?? { matched: false, matchMethod: null, matchConfidence: "low" };
        p.openFoodFacts.ecoscoreDetails = { available: false };
        console.log("product not found on OFF");
      }
      // Write after every update so progress survives an interruption.
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

  console.log(`\nDone. Enriched ${enriched}, no ecoscore data ${noData}, not found ${notFound}, errors ${errored}.`);
}

run();
