import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { calculateOverallScores, pickRecommended } from "../src/utils/calculateOverallScore.js";
import { calculateEnvironmentalScore } from "../src/utils/calculateEnvironmentalScore.js";
import { calculateHealthScore } from "../src/utils/calculateHealthScore.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const products = JSON.parse(readFileSync(path.join(__dirname, "../src/data/products.json"), "utf-8"));

let pass = 0;
let fail = 0;
const failures = [];

function check(label, condition, detail = "") {
  if (condition) {
    pass++;
  } else {
    fail++;
    failures.push(`${label}${detail ? " - " + detail : ""}`);
  }
}

console.log("=== 1. Dataset structure ===");
check("157 total products", products.length === 157, `got ${products.length}`);
const ids = products.map((p) => p.id);
check("all product ids unique", new Set(ids).size === ids.length);
check("every product has a retailer", products.every((p) => p.retailer));
check("every product has a positive price or null", products.every((p) => p.price === null || p.price > 0));

console.log("\n=== 2. Open Food Facts enrichment coverage ===");
const matched = products.filter((p) => p.openFoodFacts?.matched);
check("at least 130 products matched to OFF", matched.length >= 130, `got ${matched.length}`);
const withEcoscoreDetails = products.filter((p) => p.openFoodFacts?.ecoscoreDetails);
check("ecoscoreDetails present on all UPC-bearing products", withEcoscoreDetails.length >= 116, `got ${withEcoscoreDetails.length}`);
check(
  "no ecoscoreDetails record is malformed (missing available field)",
  withEcoscoreDetails.every((p) => typeof p.openFoodFacts.ecoscoreDetails.available === "boolean")
);

console.log("\n=== 3. Eco-Score grade coverage (all real OFF grades mapped) ===");
const gradesSeen = new Set(products.map((p) => p.openFoodFacts?.environment?.grade).filter(Boolean));
check("known grade set is exactly {a,a-plus,b,c,d,e,f}", [...gradesSeen].every((g) => ["a", "a-plus", "b", "c", "d", "e", "f"].includes(g)), `saw: ${[...gradesSeen].join(",")}`);
for (const p of products) {
  const grade = p.openFoodFacts?.environment?.grade;
  if (!grade) continue;
  const scored = calculateEnvironmentalScore(p.openFoodFacts);
  check(`${p.id}: grade "${grade}" maps to a real score, not null`, scored.score !== null, `got ${JSON.stringify(scored)}`);
}

console.log("\n=== 4. Environmental score fallback chain ===");
let realGrade = 0, novaEstimate = 0, none = 0;
for (const p of products) {
  const e = calculateEnvironmentalScore(p.openFoodFacts);
  if (e.available && !e.isEstimate) realGrade++;
  else if (e.available && e.isEstimate) novaEstimate++;
  else none++;
}
check("at least 70 products have a real Eco-Score", realGrade >= 70, `got ${realGrade}`);
check("at least 30 products have a NOVA-derived estimate", novaEstimate >= 30, `got ${novaEstimate}`);
check("real+estimate covers at least 70% of catalog", (realGrade + novaEstimate) / products.length >= 0.7, `got ${(((realGrade + novaEstimate) / products.length) * 100).toFixed(0)}%`);

console.log("\n=== 5. Scoring correctness across every comparison group ===");
const groups = new Map();
for (const p of products) {
  if (!p.subcategory) continue;
  if (!groups.has(p.subcategory)) groups.set(p.subcategory, []);
  groups.get(p.subcategory).push(p);
}

let groupsChecked = 0;
let zeroDataWins = 0;
let outOfRangeScores = 0;
let recommendMismatches = 0;
let priceRankingBugs = 0;
let groupsWithoutEnvSignal = 0;

for (const [subcat, group] of groups) {
  if (group.length < 2) continue;
  groupsChecked++;

  const scored = calculateOverallScores(
    group.map((p) => ({ id: p.id, price: p.price, unitPrice: p.unitPrice, openFoodFacts: p.openFoodFacts }))
  );

  // 5a. scores stay in bounds
  for (const s of scored) {
    if (s.overallScore != null && (s.overallScore < 0 || s.overallScore > 100)) outOfRangeScores++;
  }

  // 5b. recommendation always matches the real max
  const recId = pickRecommended(scored);
  if (recId) {
    const maxScore = Math.max(...scored.filter((s) => s.overallScore != null).map((s) => s.overallScore));
    const recScore = scored.find((s) => s.id === recId)?.overallScore;
    if (recScore !== maxScore) recommendMismatches++;

    // 5c. an unmeasured product should never beat a measured competitor
    const rec = scored.find((s) => s.id === recId);
    const hasMeasuredCompetitor = scored.some(
      (s) => s.id !== recId && (s.healthScore != null || s.environmentalDataAvailable)
    );
    if (rec.healthScore == null && !rec.environmentalDataAvailable && hasMeasuredCompetitor) zeroDataWins++;
  }

  // 5d. price score ranks correctly against real unit price
  const withPrice = scored
    .filter((s) => s.priceScore != null)
    .map((s) => ({ ...s, unitPrice: group.find((p) => p.id === s.id).unitPrice ?? group.find((p) => p.id === s.id).price }))
    .sort((a, b) => a.unitPrice - b.unitPrice);
  for (let i = 1; i < withPrice.length; i++) {
    if (withPrice[i].priceScore > withPrice[i - 1].priceScore) priceRankingBugs++;
  }

  // 5e. every group should have at least one real/estimated env data point
  if (!scored.some((s) => s.environmentalDataAvailable)) groupsWithoutEnvSignal++;
}

check(`checked ${groupsChecked} comparison groups`, groupsChecked > 0);
check("no overall score out of 0-100 range", outOfRangeScores === 0, `${outOfRangeScores} violations`);
check("pickRecommended always matches the true max score", recommendMismatches === 0, `${recommendMismatches} mismatches`);
check("no unmeasured product beats a measured competitor", zeroDataWins === 0, `${zeroDataWins} groups affected`);
check("price score always ranks correctly vs real unit price", priceRankingBugs === 0, `${priceRankingBugs} violations`);
check("every comparison group has at least one env data point", groupsWithoutEnvSignal === 0, `${groupsWithoutEnvSignal} groups blank`);

console.log("\n=== 6. Health score sanity ===");
for (const p of products) {
  if (!p.openFoodFacts?.matched) continue;
  const h = calculateHealthScore(p.openFoodFacts);
  if (p.openFoodFacts.nutrition?.nutriScoreGrade && ["a", "b", "c", "d", "e"].includes(p.openFoodFacts.nutrition.nutriScoreGrade)) {
    check(`${p.id}: has nutriscore grade -> health score is non-null`, h.score !== null);
    check(`${p.id}: health score source is "nutriscore" when grade exists`, h.source === "nutriscore");
  }
}

console.log("\n=== 7. Image backfill sanity ===");
const withImage = products.filter((p) => p.imageUrl);
check("at least 120 products have an image", withImage.length >= 120, `got ${withImage.length}`);
check("every imageUrl looks like a real URL", withImage.every((p) => /^https:\/\//.test(p.imageUrl)));
const walmartNoImage = products.filter((p) => p.retailer === "Walmart" && !p.imageUrl);
check("all 45 Walmart products have an image (SerpApi)", walmartNoImage.length === 0, `${walmartNoImage.length} missing`);

console.log("\n=== RESULTS ===");
console.log(`Passed: ${pass}`);
console.log(`Failed: ${fail}`);
if (failures.length) {
  console.log("\nFailures:");
  for (const f of failures) console.log("  - " + f);
  process.exitCode = 1;
} else {
  console.log("\nAll checks passed.");
}
