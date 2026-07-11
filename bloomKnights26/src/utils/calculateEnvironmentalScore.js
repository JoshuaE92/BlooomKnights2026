const ECOSCORE_TO_SCORE = { a: 100, b: 80, c: 60, d: 40, e: 20 };

// Neutral fallback used only inside calculateOverallScore's weighted
// average when Eco-Score is unavailable, so a data gap doesn't unfairly
// swing the balanced score up or down. This value must never be shown to
// the user as if it were a real Eco-Score - the `available` flag exists so
// the UI can render "environmental data unavailable" instead.
const NEUTRAL_FALLBACK_SCORE = 60;

// Returns { score: number|null, available: boolean, neutralFallback: number }
export function calculateEnvironmentalScore(openFoodFacts) {
  if (!openFoodFacts?.matched) {
    return { score: null, available: false, neutralFallback: NEUTRAL_FALLBACK_SCORE };
  }

  const grade = openFoodFacts.environment?.grade;
  if (grade && ECOSCORE_TO_SCORE[grade] != null) {
    return { score: ECOSCORE_TO_SCORE[grade], available: true, neutralFallback: NEUTRAL_FALLBACK_SCORE };
  }

  return { score: null, available: false, neutralFallback: NEUTRAL_FALLBACK_SCORE };
}
