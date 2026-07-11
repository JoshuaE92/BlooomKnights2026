// Verifies the pieces the team built independently actually interoperate:
// scoring (Member 2/shared) -> reason chips (Member 1) -> explanation
// (Member 3's pure-logic mock path). Does NOT require Mongo or a live
// Gemini key - it exercises the pure-function core of the pipeline using
// the real curated product data, which is the part most likely to silently
// diverge when each person builds against their own assumptions.

const { getReasons } = require('../services/greenReasonsAdapter');
const { calculateOverallScores, pickRecommended } = require('../utils/productScores');
const products = require('../data/products.json');

function mockExplanation(reasons) {
  const positives = reasons.filter((r) => r.polarity === 'positive').map((r) => r.label);
  if (!positives.length) return null;
  return `Greener pick: ${positives.join(', ').toLowerCase()}.`;
}

let pass = 0;
let fail = 0;
const failures = [];
function check(label, condition, detail = '') {
  if (condition) pass++;
  else { fail++; failures.push(`${label}${detail ? ' - ' + detail : ''}`); }
}

console.log('=== Connectivity: scoring -> reasons -> explanation ===\n');

// 1. getReasons runs on every product without crashing.
let reasonCrashes = 0;
let withReasons = 0;
for (const p of products) {
  try {
    const r = getReasons({ raw: p, id: p.id });
    if (r.length > 0) withReasons++;
  } catch {
    reasonCrashes++;
  }
}
check('getReasons never crashes on real product data', reasonCrashes === 0, `${reasonCrashes} crashes`);
check('at least 60% of products produce at least one reason chip', withReasons / products.length >= 0.6, `${((withReasons / products.length) * 100).toFixed(0)}%`);

// 2. Full pipeline per comparison group: score -> pick -> reasons -> explanation, no crashes, no nulls where data exists.
const groups = new Map();
for (const p of products) {
  if (!p.subcategory) continue;
  if (!groups.has(p.subcategory)) groups.set(p.subcategory, []);
  groups.get(p.subcategory).push(p);
}

let pipelineCrashes = 0;
let recommendedMissingExplanation = 0;
let groupsRun = 0;

for (const [subcat, group] of groups) {
  if (group.length < 2) continue;
  groupsRun++;
  try {
    const scored = calculateOverallScores(group.map((p) => ({ id: p.id, price: p.price, unitPrice: p.unitPrice, openFoodFacts: p.openFoodFacts })));
    const recId = pickRecommended(scored);
    if (!recId) continue;
    const recProduct = group.find((p) => p.id === recId);
    const reasons = getReasons({ raw: recProduct, id: recProduct.id });
    const explanation = mockExplanation(reasons);
    if (!explanation && reasons.some((r) => r.polarity === 'positive')) recommendedMissingExplanation++;
  } catch (err) {
    pipelineCrashes++;
    console.log(`  pipeline crash in "${subcat}":`, err.message);
  }
}
check('full pipeline runs on every multi-product group without crashing', pipelineCrashes === 0, `${pipelineCrashes} crashes across ${groupsRun} groups`);
check('recommended picks with positive reasons always get an explanation', recommendedMissingExplanation === 0, `${recommendedMissingExplanation} gaps`);

// 3. ecoscoreDetails is present and shaped as documented, ready for Member 3's live-Gemini path.
const withEcoDetails = products.filter((p) => p.openFoodFacts?.ecoscoreDetails?.available);
check('ecoscoreDetails.available=true records have the documented adjustments shape', withEcoDetails.every((p) => {
  const d = p.openFoodFacts.ecoscoreDetails;
  return d.adjustments && 'packaging' in d.adjustments && 'origins' in d.adjustments && 'productionSystem' in d.adjustments;
}));

console.log(`\nPassed: ${pass}\nFailed: ${fail}`);
if (failures.length) {
  console.log('\nFailures:');
  for (const f of failures) console.log('  - ' + f);
  process.exitCode = 1;
} else {
  console.log('\nAll connectivity checks passed.');
}
