const env = require('../config/env');
const { identifyNeededItems } = require('./geminiClient');
const { searchProducts, getProducts } = require('./externalProductAPI');
const { calculateOverallScores, pickRecommended } = require('../utils/productScores');

// TWO-PHASE FLOW
//   Phase 1: turn the user's request into a list of needed grocery items.
//            (Gemini if live; a simple keyword split as the mock fallback.)
//   Phase 2: for EACH needed item, search the user's stores, score the
//            candidates with the shared productScores logic, and pick the one
//            with the best balanced overallScore (price + health + environment).
//            The code does the ranking — the AI only figures out WHAT to buy.
//
// Return shape:
//   { prompt, neededItems, picks, totalCost, avgOverallScore, summary, source }
// Each pick = { id, name, store, price, unit, forItem, overallScore,
//               healthScore, environmentalScore, priceScore, environmentalDataAvailable }

// Products carry the original scraped record in `raw`; scoring reads from there.
function toScoreInput(p) {
  return {
    id: p.id,
    price: p.price,
    unitPrice: p.raw?.unitPrice,
    openFoodFacts: p.raw?.openFoodFacts,
  };
}

// Shape a chosen product for the response (drop the heavy `raw` blob).
function toPick(product, scored, forItem) {
  return {
    id: product.id,
    name: product.name,
    store: product.store,
    price: product.price,
    unit: product.unit,
    forItem,
    overallScore: scored.overallScore,
    healthScore: scored.healthScore,
    environmentalScore: scored.environmentalScore,
    priceScore: scored.priceScore,
    environmentalDataAvailable: scored.environmentalDataAvailable,
  };
}

function computeStats(picks) {
  const priced = picks.filter((p) => p.price != null);
  const totalCost = Number(priced.reduce((s, p) => s + p.price, 0).toFixed(2));

  const scored = picks.filter((p) => p.overallScore != null);
  const avgOverallScore = scored.length
    ? Math.round(scored.reduce((s, p) => s + p.overallScore, 0) / scored.length)
    : 0;
  return { totalCost, avgOverallScore };
}

// --- Phase 1 fallback: naive decomposition when Gemini is off/unavailable ---
const STOPWORDS = new Set(['and', 'for', 'the', 'with', 'some', 'need', 'want', 'make', 'get']);

function mockDecompose(prompt) {
  return (prompt || '')
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

// --- Phase 2: search stores per item, pick best overallScore not already used ---
async function pickForItems({ stores, neededItems }) {
  const picks = [];
  const seen = new Set();

  for (const item of neededItems) {
    const candidates = await searchProducts({ stores, query: item, limit: 10 });
    if (!candidates.length) continue;

    const scored = calculateOverallScores(candidates.map(toScoreInput));
    const scoredById = new Map(scored.map((s) => [s.id, s]));

    // best balanced product for this item that we haven't already picked
    const available = scored.filter((s) => !seen.has(s.id));
    const bestId = pickRecommended(available);
    if (!bestId) continue;

    seen.add(bestId);
    picks.push(toPick(candidates.find((c) => c.id === bestId), scoredById.get(bestId), item));
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
  neededItems = neededItems.slice(0, maxItems);

  // Phase 2 — search + rank per item.
  let picks = await pickForItems({ stores, neededItems });

  // Safety net: nothing matched any item → best-overall products in-store.
  if (!picks.length) {
    const all = await getProducts({ stores });
    const scored = calculateOverallScores(all.map(toScoreInput));
    const byId = new Map(all.map((p) => [p.id, p]));
    picks = scored
      .filter((s) => s.overallScore != null)
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, maxItems)
      .map((s) => toPick(byId.get(s.id), s, null));
  }

  return {
    prompt,
    neededItems,
    picks,
    ...computeStats(picks),
    summary: summary || `Found ${picks.length} items for "${prompt}".`,
    source,
  };
}

module.exports = { suggest };
