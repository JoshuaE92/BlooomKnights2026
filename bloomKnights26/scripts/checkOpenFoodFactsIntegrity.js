import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const products = JSON.parse(readFileSync(path.join(__dirname, "../src/data/products.json"), "utf-8"));

function normalize(s) {
  return (s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokens(s) {
  return new Set(normalize(s).split(" ").filter((w) => w.length > 2));
}

// Words that flip the meaning of a product if present on only one side of
// the comparison (our product vs. the OFF match) - these catch cases like
// "Thin Spaghetti" matching plain "Spaghetti", or "Reduced Fat" matching
// full-fat, where generic word overlap alone looks fine but the products
// are meaningfully different.
const DISTINGUISHING_MODIFIERS = [
  "thin", "whole", "reduced", "fat free", "light", "low fat", "low sodium",
  "no salt", "unsalted", "salted", "organic", "gluten free", "sugar free",
  "unsweetened", "sweetened", "diet", "decaf", "instant", "extra", "family",
  "mini", "large", "small", "sharp", "mild", "medium", "hot", "spicy",
];

function findModifierMismatches(productText, offText) {
  const pText = normalize(productText);
  const oText = normalize(offText);
  const mismatches = [];
  for (const mod of DISTINGUISHING_MODIFIERS) {
    const inProduct = pText.includes(mod);
    const inOff = oText.includes(mod);
    if (inProduct !== inOff) {
      mismatches.push(`"${mod}" present in ${inProduct ? "our product" : "OFF match"} only`);
    }
  }
  return mismatches;
}

console.log("--- Open Food Facts Match Integrity Report ---\n");

let checked = 0;
let flagged = 0;
const flaggedItems = [];

for (const p of products) {
  if (!p.openFoodFacts?.matched) continue;
  checked++;

  // We don't have the OFF product_name stored on the record itself (only
  // nutrition/environment fields per the project schema), so this check
  // relies on data captured at collection time. Re-derive what we can from
  // notes / barcode presence, and flag anything with low confidence for
  // manual review regardless, since those are exactly the risky matches.
  const confidence = p.openFoodFacts.matchConfidence;
  const method = p.openFoodFacts.matchMethod;

  const issues = [];

  if (confidence === "low") {
    issues.push("low confidence match - recommend manual spot-check");
  }

  if (method === "name" && !p.openFoodFacts.barcode) {
    issues.push("name-matched with no barcode returned - weaker evidence of correctness");
  }

  // Structural sanity: nutrition object should have at least one non-null
  // nutrient if matched=true; an all-null nutrition block on a "matched"
  // record suggests OFF found a stub/incomplete entry.
  const nutrients = p.openFoodFacts.nutrition?.nutrients ?? {};
  const hasAnyNutrient = Object.values(nutrients).some((v) => v !== null && v !== undefined);
  if (!hasAnyNutrient) {
    issues.push("matched=true but all nutrient fields are null (likely a stub OFF entry)");
  }

  if (issues.length > 0) {
    flagged++;
    flaggedItems.push({ id: p.id, name: p.name, retailer: p.retailer, method, confidence, issues });
  }
}

console.log(`Checked ${checked} matched records.`);
console.log(`Flagged ${flagged} for review.\n`);

for (const item of flaggedItems) {
  console.log(`[${item.retailer}] ${item.id}`);
  console.log(`  name: ${item.name}`);
  console.log(`  method: ${item.method} | confidence: ${item.confidence}`);
  for (const issue of item.issues) console.log(`  - ${issue}`);
  console.log();
}
