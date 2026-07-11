const mongoose = require('mongoose');

// Store slug (e.g. "walmart") is the _id / natural key.
const storeSchema = new mongoose.Schema(
  {
    _id: { type: String }, // slug id

    // --- STABLE CORE ---
    name: { type: String, required: true },

    // --- FLEXIBLE ---
    location: { type: String },
    zipcodes: { type: [String], default: [], index: true },

    // --- CATCH-ALL ---
    raw: { type: mongoose.Schema.Types.Mixed },
  },
  {
    timestamps: true,
    id: false,
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

module.exports = mongoose.model('Store', storeSchema);
