const NUTRISCORE_TO_SCORE = { a: 100, b: 80, c: 60, d: 40, e: 20 };

// Fallback used only when Nutri-Score grade is missing but raw nutrient
// values exist. Penalizes sugar/saturated fat/salt, rewards protein/fiber,
// all per 100g so package size doesn't skew the result. Clamped to 0-100.
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

// Returns { score: number|null, source: "nutriscore" | "nutrients" | "unavailable" }
export function calculateHealthScore(openFoodFacts) {
  if (!openFoodFacts?.matched) {
    return { score: null, source: "unavailable" };
  }

  const grade = openFoodFacts.nutrition?.nutriScoreGrade;
  if (grade && NUTRISCORE_TO_SCORE[grade] != null) {
    return { score: NUTRISCORE_TO_SCORE[grade], source: "nutriscore" };
  }

  const nutrients = openFoodFacts.nutrition?.nutrients ?? {};
  const fallback = scoreFromNutrients(nutrients);
  if (fallback != null) {
    return { score: fallback, source: "nutrients" };
  }

  return { score: null, source: "unavailable" };
}
