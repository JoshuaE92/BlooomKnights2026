const env = require('../config/env');
const { identifyNeededItems } = require('./geminiClient');
const { searchProducts, getProducts } = require('./externalProductAPI');
const { withGreenImpact } = require('../utils/greenImpactCalculator');

// TWO-PHASE FLOW
//   Phase 1: turn the user's request into a list of needed grocery items.
//            (Gemini if live; a simple keyword split as the mock fallback.)
//   Phase 2: for EACH needed item, search the user's stores and pick the
//            greenest matching product. Our code does the picking, so green
//            scores stay authoritative — the AI never touches prices/scores.
//
// Same return shape regardless of source:
//   { prompt, neededItems, picks, totalCost, avgGreenImpact, summary, source }
// Each pick is a full product object + `forItem` (which needed item it fills).

function computeStats(picks) {
  const totalCost = Number(picks.reduce((sum, p) => sum + p.price, 0).toFixed(2));
  const avgGreenImpact = picks.length
    ? Math.round(picks.reduce((sum, p) => sum + p.greenImpact, 0) / picks.length)
    : 0;
  return { totalCost, avgGreenImpact };
}

// --- Phase 1 fallback: naive decomposition when Gemini is off/unavailable ---
const STOPWORDS = new Set(['and', 'for', 'the', 'with', 'some', 'need', 'want', 'make', 'get']);

function mockDecompose(prompt) {
  return (prompt || '')
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

// --- Phase 2: search stores per item, pick greenest not already chosen ------
async function pickForItems({ stores, neededItems }) {
  const picks = [];
  const seen = new Set();

  for (const item of neededItems) {
    const candidates = (await searchProducts({ stores, query: item, limit: 10 }))
      .map(withGreenImpact)
      .sort((a, b) => b.greenImpact - a.greenImpact);

    const best = candidates.find((c) => !seen.has(c.id)); // greenest still available
    if (best) {
      seen.add(best.id);
      picks.push({ ...best, forItem: item });
    }
  }
  return picks;
}

// --- public entry point -----------------------------------------------------
async function suggest({ prompt, stores, maxItems = 6 }) {
  // Phase 1 — decompose the request into needed items.
  let neededItems;
  let summary = null;
  let source = 'mock';

  if (env.AI_MODE === 'live' && env.GEMINI_API_KEY) {
    try {
      const r = await identifyNeededItems({ prompt, maxItems });
      neededItems = r.neededItems;
      summary = r.summary;
      source = 'gemini';
    } catch (err) {
      console.warn('[aiService] Gemini decompose failed, using mock:', err.message);
    }
  }
  if (!neededItems || !neededItems.length) {
    neededItems = mockDecompose(prompt);
    source = 'mock';
  }

  // Phase 2 — search the stores for each item and pick the greenest.
  let picks = await pickForItems({ stores, neededItems });

  // Safety net: nothing matched any item → just offer the greenest in-store.
  if (!picks.length) {
    picks = (await getProducts({ stores }))
      .map(withGreenImpact)
      .sort((a, b) => b.greenImpact - a.greenImpact)
      .slice(0, maxItems)
      .map((p) => ({ ...p, forItem: null }));
  }

  return {
    prompt,
    neededItems,
    picks,
    ...computeStats(picks),
    summary: summary || `Found ${picks.length} greener items for "${prompt}".`,
    source,
  };
}

module.exports = { suggest };
