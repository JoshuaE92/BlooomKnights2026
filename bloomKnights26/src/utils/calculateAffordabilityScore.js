// Price scores are relative to a comparison set (e.g. all products matched
// to one search/ingredient), since a unit price alone ("$0.12/oz") isn't
// meaningful without competitors to compare against.
//
// Cheapest unit price in the set scores 100; others scale down linearly
// against the most expensive item in the set. Falls back to total price
// when unit price is unavailable for a product.
export function calculateAffordabilityScores(products) {
  const priced = products
    .map((p) => ({ id: p.id, value: p.unitPrice ?? p.price }))
    .filter((p) => p.value != null && p.value > 0);

  if (priced.length === 0) {
    return new Map(products.map((p) => [p.id, null]));
  }

  const min = Math.min(...priced.map((p) => p.value));
  const max = Math.max(...priced.map((p) => p.value));
  const range = max - min;

  const scores = new Map();
  for (const p of products) {
    const value = p.unitPrice ?? p.price;
    if (value == null || value <= 0) {
      scores.set(p.id, null);
      continue;
    }
    const score = range === 0 ? 100 : Math.round(100 - ((value - min) / range) * 80);
    scores.set(p.id, score);
  }
  return scores;
}
