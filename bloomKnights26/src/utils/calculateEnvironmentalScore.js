// OFF's Eco-Score is usually A-E, but a small number of products carry an
// "a-plus" (above A) or "f" (not-applicable/worst-case, below E) grade -
// map both onto the scale rather than letting them fall through to
// unavailable/neutral.
const ECOSCORE_TO_SCORE = { "a-plus": 100, a: 90, b: 80, c: 60, d: 40, e: 20, f: 5 };

// Fallback used when no real Eco-Score exists but NOVA (processing level,
// 1-4) does. NOVA is not an environmental measurement - it's a proxy: more
// processing steps generally mean more industrial inputs, packaging, and
// energy, which correlates loosely with footprint. This is a genuinely
// weaker signal than a real Eco-Score and must be labeled as an estimate,
// never presented with the same confidence as `available: true` from a
// real grade.
const NOVA_TO_ESTIMATED_SCORE = { 1: 75, 2: 60, 3: 45, 4: 25 };

// Neutral fallback used only inside calculateOverallScore's weighted
// average when neither Eco-Score nor NOVA is available, so a total data
// gap doesn't unfairly swing the balanced score up or down. This value
// must never be shown to the user as if it were a real score - the
// `available`/`isEstimate` flags exist so the UI can render the right
// caveat instead.
const NEUTRAL_FALLBACK_SCORE = 60;

// Returns:
//   { score, available: true,  isEstimate: false, neutralFallback } - real Eco-Score grade
//   { score, available: true,  isEstimate: true,  neutralFallback } - NOVA-derived estimate
//   { score: null, available: false, isEstimate: false, neutralFallback } - no signal at all
export function calculateEnvironmentalScore(openFoodFacts) {
  if (!openFoodFacts?.matched) {
    return { score: null, available: false, isEstimate: false, neutralFallback: NEUTRAL_FALLBACK_SCORE };
  }

  const grade = openFoodFacts.environment?.grade;
  if (grade && ECOSCORE_TO_SCORE[grade] != null) {
    return { score: ECOSCORE_TO_SCORE[grade], available: true, isEstimate: false, neutralFallback: NEUTRAL_FALLBACK_SCORE };
  }

  const nova = openFoodFacts.nutrition?.novaGroup;
  if (nova && NOVA_TO_ESTIMATED_SCORE[nova] != null) {
    return { score: NOVA_TO_ESTIMATED_SCORE[nova], available: true, isEstimate: true, neutralFallback: NEUTRAL_FALLBACK_SCORE };
  }

  return { score: null, available: false, isEstimate: false, neutralFallback: NEUTRAL_FALLBACK_SCORE };
}
