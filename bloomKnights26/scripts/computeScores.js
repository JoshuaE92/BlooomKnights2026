import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { calculateOverallScores, pickRecommended } from "../src/utils/calculateOverallScore.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const productsPath = path.join(__dirname, "../src/data/products.json");
const products = JSON.parse(readFileSync(productsPath, "utf-8"));

// Group by subcategory: this is the unit of comparison a user actually
// sees (e.g. "spaghetti" across all three retailers), matching how the
// app will present search results. Products without a subcategory are
// skipped rather than lumped into a meaningless catch-all group.
const groups = new Map();
for (const p of products) {
  if (!p.subcategory) continue;
  if (!groups.has(p.subcategory)) groups.set(p.subcategory, []);
  groups.get(p.subcategory).push(p);
}

let scoredCount = 0;
let recommendedCount = 0;

for (const [subcategory, group] of groups) {
  const scores = calculateOverallScores(group);
  const recommendedId = pickRecommended(scores);

  for (const s of scores) {
    const product = group.find((p) => p.id === s.id);
    product.scores = {
      priceScore: s.priceScore,
      healthScore: s.healthScore,
      healthScoreSource: s.healthScoreSource,
      environmentalScore: s.environmentalScore,
      environmentalDataAvailable: s.environmentalDataAvailable,
      overallScore: s.overallScore,
      isRecommended: s.id === recommendedId,
      comparisonGroup: subcategory,
      comparisonGroupSize: group.length,
    };
    scoredCount++;
    if (s.id === recommendedId) recommendedCount++;
  }
}

writeFileSync(productsPath, JSON.stringify(products, null, 2) + "\n");

console.log(`Scored ${scoredCount} products across ${groups.size} subcategory groups.`);
console.log(`${recommendedCount} products marked as recommended (one per group with 2+ products having a computable score).`);

const single = [...groups.entries()].filter(([, g]) => g.length === 1);
console.log(`${single.length} subcategories have only 1 product (no real comparison possible): ${single.map(([k]) => k).join(", ")}`);
