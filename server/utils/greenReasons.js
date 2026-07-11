// Bridge module: greenReasonsAdapter.js auto-loads Member 1's reasons from
// `utils/greenReasons`. Our implementation + tag vocabulary live in greenTags.js,
// so re-export greenReasons here. This makes the green *synthesis* (Member 3)
// use OUR canonical tags instead of its built-in fallback.
module.exports = { greenReasons: require('./greenTags').greenReasons };
