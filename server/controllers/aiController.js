const { suggest } = require('../services/aiService');
const recipeStore = require('../services/recipeStore');

// POST /api/ai/suggest
// body: { userId, stores: ["walmart","costco"], prompt: "tacos for 4" }
async function suggestCart(req, res, next) {
  try {
    const { userId, stores, prompt } = req.body || {};

    if (!prompt) return res.status(400).json({ error: 'prompt is required' });
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    // Two-phase AI: decompose the request into needed items, then search the
    // user's stores and pick the greenest product for each. (See aiService.)
    const result = await suggest({ prompt, stores });

    // Save this query under the user's history.
    const saved = recipeStore.save({ userId, prompt, result });

    res.json({ queryId: saved.id, ...result });
  } catch (err) {
    next(err);
  }
}

// GET /api/ai/history/:userId  -> this user's past queries.
async function getHistory(req, res, next) {
  try {
    const history = recipeStore.getByUser(req.params.userId);
    res.json({ userId: req.params.userId, count: history.length, history });
  } catch (err) {
    next(err);
  }
}

module.exports = { suggestCart, getHistory };
