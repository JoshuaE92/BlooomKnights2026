// In-memory stand-in for the RecipeQuery model / collection.
// Keeps each user's past prompts + results so we have "chat history per user".
// Swaps to Mongo later: save() -> RecipeQuery.create(), getByUser() -> find().
//
// NOTE: resets on server restart. That's fine for a mock/demo.

const queriesByUser = new Map(); // userId -> array of saved queries
let nextId = 1;

function save({ userId, prompt, result }) {
  const record = { id: nextId++, userId, prompt, result };
  if (!queriesByUser.has(userId)) queriesByUser.set(userId, []);
  queriesByUser.get(userId).push(record);
  return record;
}

function getByUser(userId) {
  return queriesByUser.get(userId) || [];
}

module.exports = { save, getByUser };
