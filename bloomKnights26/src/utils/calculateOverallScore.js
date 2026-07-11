import { calculateHealthScore } from "./calculateHealthScore.js";
import { calculateEnvironmentalScore } from "./calculateEnvironmentalScore.js";
import { calculateAffordabilityScores } from "./calculateAffordabilityScore.js";

// Environmental impact is the primary factor per the project's core goal;
// price and health remain meaningful but secondary.
const WEIGHTS = { price: 0.25, health: 0.25, environmental: 0.5 };

// Score used in the weighted average when a metric has NO data at all
// (never fetched/matched), as opposed to data that was fetched but came
// back genuinely neutral/middling. Deliberately below the neutral
// fallback (60): a product we can't vouch for at all should not be able
// to out-rank a competitor with a real, even mediocre, measured score -
// otherwise unmeasured products systematically win on price alone, which
// defeats the purpose of measuring anything. Never shown to the user as
// a real score.
const UNMEASURED_PENALTY_SCORE = 35;

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

    // Both health and environmental gaps use a fallback inside the
    // weighted average rather than being excluded (excluding them lets an
    // unmeasured product win purely on price - see calculateOverallScore
    // test findings). Environmental has its own softer neutral fallback
    // for partial-data cases (see calculateEnvironmentalScore.js);
    // genuinely absent data on either metric uses the harsher
    // UNMEASURED_PENALTY_SCORE.
    const environmentalForAverage = environmental.available
      ? environmental.score
      : (openFoodFactsHasAnyEnvSignal(p.openFoodFacts) ? environmental.neutralFallback : UNMEASURED_PENALTY_SCORE);
    const healthForAverage = health.score != null ? health.score : UNMEASURED_PENALTY_SCORE;

    const components = [
      price != null ? { key: "price", value: price, weight: WEIGHTS.price } : null,
      { key: "health", value: healthForAverage, weight: WEIGHTS.health },
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
      environmentalScoreIsEstimate: environmental.isEstimate,
      overallScore: overall,
    };
  });
}

// A product counts as having "some" environmental signal (soft neutral
// fallback) only if it was actually matched to Open Food Facts at all -
// an unmatched product gets the harsher unmeasured penalty instead.
function openFoodFactsHasAnyEnvSignal(openFoodFacts) {
  return Boolean(openFoodFacts?.matched);
}

// Convenience helper: given calculateOverallScores output, returns the id
// of the single best product, or null if none have a computable score.
export function pickRecommended(scoredProducts) {
  const withScore = scoredProducts.filter((p) => p.overallScore != null);
  if (withScore.length === 0) return null;
  return withScore.reduce((best, p) => (p.overallScore > best.overallScore ? p : best)).id;
}
