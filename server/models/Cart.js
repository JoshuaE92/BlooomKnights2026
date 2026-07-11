const mongoose = require('mongoose');

// A saved cart snapshot — what the user checked out from the cart page.
// Powers the dashboard's "Saved Cart" + "Previous Carts" views.
const cartSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    store: { type: String },

    // [{ id, name, price, unit, quantity, greenScore }] — kept flexible (Mixed)
    // so the frontend can evolve the item shape without schema churn.
    items: { type: [mongoose.Schema.Types.Mixed], default: [] },

    total: { type: Number, required: true },

    // Average green score of the items (the "Green Meter" value, 0-100).
    greenScore: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

module.exports = mongoose.model('Cart', cartSchema);
