import { calculateHealthScore } from "./calculateHealthScore.js";
import { calculateEnvironmentalScore } from "./calculateEnvironmentalScore.js";
import { calculateAffordabilityScores } from "./calculateAffordabilityScore.js";

const WEIGHTS = { price: 0.35, health: 0.35, environmental: 0.3 };

// Computes a balanced score for every product in a comparison set (e.g. all
// products matched to one ingredient search). Returns an array parallel to
// the input, each entry carrying the per-metric scores plus the weighted
// overall score, so the UI can show real numbers and flag what's missing
// rather than presenting a single opaque figure.
export function calculateOverallScores(products) {
  const priceScores = calculateAffordabilityScores(products);

  return products.map((p) => {
    const price = priceScores.get(p.id);
    const health = calculateHealthScore(p.openFoodFacts);
    const environmental = calculateEnvironmentalScore(p.openFoodFacts);

    // Environmental gaps use a neutral fallback inside the weighted average
    // only - never surfaced to the user as a real score (see
    // calculateEnvironmentalScore.js). Health gaps are excluded from the
    // average entirely (renormalizing remaining weights) since there is
    // no safe neutral guess for a genuinely unknown nutrition profile.
    const environmentalForAverage = environmental.available ? environmental.score : environmental.neutralFallback;

    const components = [
      price != null ? { key: "price", value: price, weight: WEIGHTS.price } : null,
      health.score != null ? { key: "health", value: health.score, weight: WEIGHTS.health } : null,
      { key: "environmental", value: environmentalForAverage, weight: WEIGHTS.environmental },
    ].filter(Boolean);

    const totalWeight = components.reduce((sum, c) => sum + c.weight, 0);
    const overall = totalWeight > 0
      ? Math.round(components.reduce((sum, c) => sum + c.value * c.weight, 0) / totalWeight)
      : null;

    return {
      id: p.id,
      priceScore: price,
      healthScore: health.score,
      healthScoreSource: health.source,
      environmentalScore: environmental.available ? environmental.score : null,
      environmentalDataAvailable: environmental.available,
      overallScore: overall,
    };
  });
}

// Convenience helper: given calculateOverallScores output, returns the id
// of the single best product, or null if none have a computable score.
export function pickRecommended(scoredProducts) {
  const withScore = scoredProducts.filter((p) => p.overallScore != null);
  if (withScore.length === 0) return null;
  return withScore.reduce((best, p) => (p.overallScore > best.overallScore ? p : best)).id;
}
