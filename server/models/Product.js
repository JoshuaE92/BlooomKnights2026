const mongoose = require('mongoose');

// We store the product slug (e.g. "walmart-organic-black-beans-15oz") as _id
// so it stays the natural key across data sources. A toJSON transform renames
// _id -> id so API responses keep the exact same shape as our JSON contract.
const productSchema = new mongoose.Schema(
  {
    _id: { type: String }, // slug id

    // --- STABLE CORE: always required, every data source must provide these ---
    name: { type: String, required: true },
    store: { type: String, required: true, index: true },
    price: { type: Number, required: true },

    // --- FLEXIBLE: optional, filled in when the source has it ---
    unit: { type: String },
    tags: { type: [String], default: [] },

    // --- CATCH-ALL: stash any scraped/API fields we haven't formalized yet ---
    raw: { type: mongoose.Schema.Types.Mixed },
  },
  {
    timestamps: true,
    id: false, // don't add Mongoose's default `id` virtual; we set it ourselves
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

module.exports = mongoose.model('Product', productSchema);
