const env = require('../config/env');
const Product = require('../models/Product');
const { explainGreenPick } = require('./geminiClient');
const { getReasons } = require('./greenReasonsAdapter');

// Per-pick "why greener" one-liners for /api/ai/suggest.
//
// Cache strategy: Gemini-written sentences are persisted on the Product doc
// (greenExplanation field), so each product costs at most ONE Gemini call ever
// — not one per request. Mock sentences are cheap and are NOT persisted, so
// once a GEMINI_API_KEY shows up, real explanations replace them automatically.

// Mock fallback: join the positive reason chips into an honest sentence.
function mockExplanation(reasons) {
  const positives = reasons.filter((r) => r.polarity === 'positive').map((r) => r.label);
  if (!positives.length) return null; // nothing genuine to say — say nothing
  return `Greener pick: ${positives.join(', ').toLowerCase()}.`;
}

// Attach a greenExplanation to each pick (array of { id, ... } from aiService).
// Looks up full product docs itself, so callers don't need to carry `raw`.
async function attachGreenExplanations(picks) {
  if (!picks.length) return picks;

  const docs = await Product.find({ _id: { $in: picks.map((p) => p.id) } }).lean();
  const byId = new Map(docs.map((d) => [d._id, d]));
  const useGemini = env.AI_MODE === 'live' && env.GEMINI_API_KEY;

  const explanations = await Promise.all(
    picks.map(async (pick) => {
      const doc = byId.get(pick.id);
      if (!doc) return null;

      // 1) cached on the product? done — zero AI calls.
      if (doc.greenExplanation?.text) return doc.greenExplanation.text;

      const reasons = getReasons({ ...doc, id: doc._id });

      // 2) live Gemini, persisted for every future request
      if (useGemini) {
        try {
          const text = await explainGreenPick({
            product: { name: doc.name, price: doc.price },
            reasons,
            ecoscoreDetails: doc.raw?.openFoodFacts?.ecoscoreDetails || null,
          });
          if (text) {
            await Product.updateOne(
              { _id: doc._id },
              { greenExplanation: { text, generatedAt: new Date() } }
            );
            return text;
          }
        } catch (err) {
          console.warn(`[greenExplanation] Gemini failed for ${doc._id}:`, err.message);
        }
      }

      // 3) mock fallback (not persisted)
      return mockExplanation(reasons);
    })
  );

  return picks.map((pick, i) => ({ ...pick, greenExplanation: explanations[i] }));
}

module.exports = { attachGreenExplanations };
