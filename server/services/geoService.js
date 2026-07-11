const Store = require('../models/Store');

// Another swap point (like externalProductAPI): now backed by MongoDB,
// matching a zip against each store's served-zipcode list. Later it could
// call a real geo/store-locator API — callers only depend on the return shape.
//
// Contract: resolves to an array of stores that serve the given zipcode.
// No zip -> return all stores.

const toApi = ({ _id, __v, ...rest }) => ({ id: _id, ...rest });

async function getStoresForZip(zip) {
  const filter = zip ? { zipcodes: String(zip) } : {};
  const docs = await Store.find(filter).lean();
  return docs.map(toApi);
}

module.exports = { getStoresForZip };
