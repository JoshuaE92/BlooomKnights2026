// MOCK AI — the swap point for a real model call later.
//
// Contract: given the user's prompt and a SHORTLIST of candidate products
// (already fetched + green-scored by the controller), return the products the
// "AI" picked for the recipe, plus a short explanation. It NEVER invents
// products — it only chooses from the candidates it was handed.
//
// Today this is rule-based (keyword relevance + greenest-first). Tomorrow,
// replace the body with a Claude call that receives the same shortlist and
// returns the same shape. Nothing upstream changes.

// Turn free text into lowercase word tokens we can match against.
function tokenize(text) {
  return (text || '')
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length > 2); // drop "a", "of", etc.
}

// How well does one product match the prompt? Count keyword hits in the
// product's name + tags. 0 = not relevant to this recipe.
function relevance(product, promptTokens) {
  const haystack = `${product.name} ${product.tags.join(' ')}`.toLowerCase();
  return promptTokens.reduce((score, token) => (haystack.includes(token) ? score + 1 : score), 0);
}

export function suggest({ prompt, products, maxPicks = 5 }) {
  const tokens = tokenize(prompt);

  // 1. Rank candidates: most relevant first, then greenest as the tiebreaker.
  const ranked = products
    .map((p) => ({ ...p, _relevance: relevance(p, tokens) }))
    .sort((a, b) => b._relevance - a._relevance || b.greenImpact - a.greenImpact);

  // 2. Prefer products that actually matched the prompt; if nothing matched,
  //    fall back to the greenest overall so the user still gets a cart.
  const matched = ranked.filter((p) => p._relevance > 0);
  const chosen = (matched.length ? matched : ranked).slice(0, maxPicks);

  // 3. Strip the internal _relevance field before returning.
  const picks = chosen.map(({ _relevance, ...p }) => p);

  // 4. Summary stats for the green-impact report.
  const totalCost = Number(picks.reduce((sum, p) => sum + p.price, 0).toFixed(2));
  const avgGreenImpact = picks.length
    ? Math.round(picks.reduce((sum, p) => sum + p.greenImpact, 0) / picks.length)
    : 0;

  return {
    prompt,
    picks,
    totalCost,
    avgGreenImpact,
    summary:
      picks.length && matched.length
        ? `Picked ${picks.length} greener items for "${prompt}" (avg green impact ${avgGreenImpact}/100).`
        : `No direct matches for "${prompt}" — suggested your ${picks.length} greenest options instead.`,
  };
}
