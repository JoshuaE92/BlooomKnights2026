const { suggest } = require('../services/aiService');
const RecipeQuery = require('../models/RecipeQuery');

// POST /api/ai/suggest   (protected)
// body: { stores: ["walmart","costco"], prompt: "tacos for 4" }
// The user comes from the JWT (req.user) — clients can't act as someone else.
async function suggestCart(req, res, next) {
  try {
    const { stores, prompt } = req.body;

    // Two-phase AI: decompose the request into needed items, then search the
    // user's stores and pick the greenest product for each. (See aiService.)
    const result = await suggest({ prompt, stores });

    // Save this query under the user's history.
    const saved = await RecipeQuery.create({ userId: req.user._id, prompt, result });

    res.json({ queryId: saved.id, ...result });
  } catch (err) {
    next(err);
  }
}

// GET /api/ai/history   (protected) -> the logged-in user's past queries.
async function getHistory(req, res, next) {
  try {
    const history = await RecipeQuery.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ userId: req.user._id, count: history.length, history });
  } catch (err) {
    next(err);
  }
}

module.exports = { suggestCart, getHistory };
