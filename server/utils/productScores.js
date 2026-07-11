// Product scoring — ported from the frontend utils (calculate*Score.js) so the
// backend LLM ranks products the SAME way the app does. Works off the Open Food
// Facts data attached to each product (health = Nutri-Score, environmental =
// eco-score, affordability = relative unit price). Overall = weighted blend.
//
// Input products must carry: { id, price, unitPrice, openFoodFacts }.

const NUTRISCORE_TO_SCORE = { a: 100, b: 80, c: 60, d: 40, e: 20 };
const ECOSCORE_TO_SCORE = { a: 100, b: 80, c: 60, d: 40, e: 20 };
const NEUTRAL_FALLBACK_SCORE = 60; // used only inside the weighted average
const WEIGHTS = { price: 0.35, health: 0.35, environmental: 0.3 };

// --- HEALTH (Nutri-Score, with a nutrient-based fallback) -------------------
function scoreFromNutrients(nutrients) {
  const { sugars100g, saturatedFat100g, salt100g, proteins100g, fiber100g } = nutrients;
  if ([sugars100g, saturatedFat100g, salt100g, proteins100g, fiber100g].every((v) => v == null)) {
    return null;
  }
  let score = 70;
  if (sugars100g != null) score -= Math.min(sugars100g, 40) * 0.5;
  if (saturatedFat100g != null) score -= Math.min(saturatedFat100g, 30) * 0.7;
  if (salt100g != null) score -= Math.min(salt100g, 5) * 4;
  if (proteins100g != null) score += Math.min(proteins100g, 30) * 0.5;
  if (fiber100g != null) score += Math.min(fiber100g, 15) * 1;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function calculateHealthScore(openFoodFacts) {
  if (!openFoodFacts?.matched) return { score: null, source: 'unavailable' };

  const grade = openFoodFacts.nutrition?.nutriScoreGrade;
  if (grade && NUTRISCORE_TO_SCORE[grade] != null) {
    return { score: NUTRISCORE_TO_SCORE[grade], source: 'nutriscore' };
  }
  const fallback = scoreFromNutrients(openFoodFacts.nutrition?.nutrients ?? {});
  if (fallback != null) return { score: fallback, source: 'nutrients' };

  return { score: null, source: 'unavailable' };
}

// --- ENVIRONMENTAL (eco-score grade) ----------------------------------------
function calculateEnvironmentalScore(openFoodFacts) {
  if (!openFoodFacts?.matched) {
    return { score: null, available: false, neutralFallback: NEUTRAL_FALLBACK_SCORE };
  }
  const grade = openFoodFacts.environment?.grade;
  if (grade && ECOSCORE_TO_SCORE[grade] != null) {
    return { score: ECOSCORE_TO_SCORE[grade], available: true, neutralFallback: NEUTRAL_FALLBACK_SCORE };
  }
  return { score: null, available: false, neutralFallback: NEUTRAL_FALLBACK_SCORE };
}

// --- AFFORDABILITY (relative to the comparison set) -------------------------
function calculateAffordabilityScores(products) {
  const priced = products
    .map((p) => ({ id: p.id, value: p.unitPrice ?? p.price }))
    .filter((p) => p.value != null && p.value > 0);

  if (priced.length === 0) return new Map(products.map((p) => [p.id, null]));

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
    scores.set(p.id, range === 0 ? 100 : Math.round(100 - ((value - min) / range) * 80));
  }
  return scores;
}

// --- OVERALL (weighted blend, computed per comparison set) ------------------
function calculateOverallScores(products) {
  const priceScores = calculateAffordabilityScores(products);

  return products.map((p) => {
    const price = priceScores.get(p.id);
    const health = calculateHealthScore(p.openFoodFacts);
    const environmental = calculateEnvironmentalScore(p.openFoodFacts);
    const envForAvg = environmental.available ? environmental.score : environmental.neutralFallback;

    const components = [
      price != null ? { value: price, weight: WEIGHTS.price } : null,
      health.score != null ? { value: health.score, weight: WEIGHTS.health } : null,
      { value: envForAvg, weight: WEIGHTS.environmental },
    ].filter(Boolean);

    const totalWeight = components.reduce((s, c) => s + c.weight, 0);
    const overall = totalWeight > 0
      ? Math.round(components.reduce((s, c) => s + c.value * c.weight, 0) / totalWeight)
      : null;

    return {
      id: p.id,
      priceScore: price,
      healthScore: health.score,
      environmentalScore: environmental.available ? environmental.score : null,
      environmentalDataAvailable: environmental.available,
      overallScore: overall,
    };
  });
}

// Given calculateOverallScores output, return the id of the best product.
function pickRecommended(scoredProducts) {
  const withScore = scoredProducts.filter((p) => p.overallScore != null);
  if (withScore.length === 0) return null;
  return withScore.reduce((best, p) => (p.overallScore > best.overallScore ? p : best)).id;
}

module.exports = {
  calculateHealthScore,
  calculateEnvironmentalScore,
  calculateAffordabilityScores,
  calculateOverallScores,
  pickRecommended,
};
