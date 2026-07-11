// The ONLY place the green-scoring formula lives.
// Input: a product (raw facts). Output: a 0-100 score.
// It reads tags only — no ingredient parsing, no stored numbers to maintain.
//
// Tune these weights to change scoring everywhere at once. Positive = greener,
// negative = higher footprint. Every product starts at a neutral baseline.
const BASELINE = 50;

const TAG_WEIGHTS = {
  organic: 20,
  local: 15,
  'grass-fed': 12,
  vegan: 8,
  'whole-grain': 5,
  bulk: 5, // less packaging per unit
  produce: 3,
  canned: -3, // processing + packaging
  dairy: -8,
  meat: -15, // higher carbon footprint
  imported: -18, // shipping distance
};

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

// Pure function: compute the score for one product.
export function computeGreenImpact(product) {
  const tags = product.tags || [];
  const score = tags.reduce((total, tag) => total + (TAG_WEIGHTS[tag] || 0), BASELINE);
  return Math.round(clamp(score, 0, 100));
}

// Convenience: return a copy of the product with greenImpact attached.
// Use this at the edge (controller) so the raw catalog stays score-free.
export function withGreenImpact(product) {
  return { ...product, greenImpact: computeGreenImpact(product) };
}
