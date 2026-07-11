const Cart = require('../models/Cart');

// POST /api/carts   (protected)
// body: { store, items: [{ id, name, price, unit, quantity, greenScore }], total, greenScore }
// Saves a cart snapshot for the logged-in user (dashboard history).
async function saveCart(req, res, next) {
  try {
    const { store, items, total, greenScore } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'items must be a non-empty array' });
    }
    if (typeof total !== 'number') {
      return res.status(400).json({ success: false, message: 'total must be a number' });
    }

    const cart = await Cart.create({
      userId: req.user._id,
      store,
      items,
      total,
      greenScore: typeof greenScore === 'number' ? greenScore : 0,
    });

    res.status(201).json({ success: true, cart });
  } catch (err) {
    next(err);
  }
}

// GET /api/carts   (protected) -> the user's saved carts, newest first.
async function getCarts(req, res, next) {
  try {
    const limit = Math.min(Number(req.query.limit) || 8, 25);
    const carts = await Cart.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json({ count: carts.length, carts });
  } catch (err) {
    next(err);
  }
}

module.exports = { saveCart, getCarts };
