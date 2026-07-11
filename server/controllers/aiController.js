import { getProducts } from '../services/externalProductAPI.js';
import { withGreenImpact } from '../utils/greenImpactCalculator.js';
import { suggest } from '../services/aiService.js';
import * as recipeStore from '../services/recipeStore.js';

// How many candidates we hand the AI. The whole point of preprocessing:
// the model sees a focused shortlist, not the entire catalog.
const SHORTLIST_SIZE = 15;

// POST /api/ai/suggest
// body: { userId, stores: ["walmart","costco"], prompt: "tacos for 4" }
export async function suggestCart(req, res, next) {
  try {
    const { userId, stores, prompt } = req.body || {};

    if (!prompt) return res.status(400).json({ error: 'prompt is required' });
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    // 1. RETRIEVE — pull products for the user's selected stores.
    const raw = await getProducts({ stores });

    // 2. PREPROCESS — attach green scores, rank greenest-first, take a shortlist.
    const shortlist = raw
      .map(withGreenImpact)
      .sort((a, b) => b.greenImpact - a.greenImpact)
      .slice(0, SHORTLIST_SIZE);

    // 3. AI — hand the shortlist + prompt to the (mock) model.
    const result = suggest({ prompt, products: shortlist });

    // 4. STORE — save this query under the user's history.
    const saved = recipeStore.save({ userId, prompt, result });

    // 5. RESPOND.
    res.json({ queryId: saved.id, ...result });
  } catch (err) {
    next(err);
  }
}

// GET /api/ai/history/:userId  -> this user's past queries.
export async function getHistory(req, res, next) {
  try {
    const history = recipeStore.getByUser(req.params.userId);
    res.json({ userId: req.params.userId, count: history.length, history });
  } catch (err) {
    next(err);
  }
}
