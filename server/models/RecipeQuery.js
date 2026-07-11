const mongoose = require('mongoose');

// One saved AI query = one user's prompt + the result we returned.
// This is the "chat history per user" store (replaces the in-memory recipeStore).
const recipeQuerySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    prompt: { type: String, required: true },

    // The whole aiService output (picks, totalCost, avgGreenImpact, summary).
    // Mixed = we don't over-specify the AI's response shape while it's evolving.
    result: { type: mongoose.Schema.Types.Mixed },
  },
  {
    timestamps: true, // gives us createdAt for free — sortable chat history
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

module.exports = mongoose.model('RecipeQuery', recipeQuerySchema);
