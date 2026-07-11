// MEMBER 1 — green tag vocabulary + reasons + ranking/filtering.
//
// The data we pull describes everything (price, health, packaging, eco). This
// module distills the *environmental* signal into: (a) a canonical set of green
// TAGS, (b) human-readable REASONS ("why it's green"), and (c) a green SCORE we
// can sort/filter by so greener items rise to the top.
//
// This is separate from productScores.js: overallScore = balanced pick (price+
// health+env); greenScore here = environment-focused, for the "feel greener"
// list ranking/filtering.

// ---------------------------------------------------------------------------
// 1) CANONICAL TAG VOCABULARY  (this is the shared contract for Member 3)
//    key -> { label, polarity, category, weight }
//    weight = how much it nudges greenScore (points). Positive = greener.
// ---------------------------------------------------------------------------
const TAGS = {
  // certifications / production
  organic:              { label: 'Organic certified',    polarity: 'positive', category: 'certification', weight: 10 },
  'fair-trade':         { label: 'Fair Trade',           polarity: 'positive', category: 'certification', weight: 8 },
  'rainforest-alliance':{ label: 'Rainforest Alliance',  polarity: 'positive', category: 'certification', weight: 6 },
  'sustainable-seafood':{ label: 'Sustainable seafood',  polarity: 'positive', category: 'certification', weight: 6 },
  'non-gmo':            { label: 'Non-GMO',              polarity: 'positive', category: 'certification', weight: 3 },
  'plant-based':        { label: 'Plant-based',          polarity: 'positive', category: 'diet',          weight: 5 },
  // packaging
  'recyclable-packaging':{ label: 'Recyclable packaging', polarity: 'positive', category: 'packaging', weight: 6 },
  'plastic-packaging':   { label: 'Plastic packaging',    polarity: 'negative', category: 'packaging', weight: -8 },
  // eco-score (from Open Food Facts)
  'eco-score-high':     { label: 'Low eco impact (A/B)',  polarity: 'positive', category: 'eco', weight: 0 }, // grade already sets base
  'eco-score-low':      { label: 'High eco impact (D/E)', polarity: 'negative', category: 'eco', weight: 0 },
  // processing
  'minimally-processed':{ label: 'Minimally processed',   polarity: 'positive', category: 'processing', weight: 3 },
  'ultra-processed':    { label: 'Ultra-processed',       polarity: 'negative', category: 'processing', weight: -3 },
};

// OFF label codes -> our canonical tag
const LABEL_MAP = {
  'en:organic': 'organic', 'en:eu-organic': 'organic', 'en:us-organic': 'organic',
  'en:usda-organic': 'organic', 'en:fr-organic': 'organic',
  'en:fair-trade': 'fair-trade', 'en:fairtrade-international': 'fair-trade', 'en:max-havelaar': 'fair-trade',
  'en:rainforest-alliance': 'rainforest-alliance',
  'en:sustainable-seafood-msc': 'sustainable-seafood', 'en:msc': 'sustainable-seafood',
  'en:non-gmo-project': 'non-gmo', 'en:no-gmos': 'non-gmo',
  'en:vegan': 'plant-based', 'en:vegetarian': 'plant-based',
};

// OFF packaging codes -> our canonical tag
const PACKAGING_MAP = {
  'en:glass': 'recyclable-packaging', 'en:cardboard': 'recyclable-packaging',
  'en:card-box': 'recyclable-packaging', 'en:cardboard-box': 'recyclable-packaging',
  'en:paper': 'recyclable-packaging', 'en:metal': 'recyclable-packaging',
  'en:aluminium': 'recyclable-packaging', 'en:steel': 'recyclable-packaging',
  'en:plastic': 'plastic-packaging',
};

const GRADE_TO_SCORE = { a: 100, b: 80, c: 60, d: 40, e: 20 };
const NEUTRAL_BASE = 50; // used when there's a green signal but no eco grade

// Read OFF data whether product is raw-scraped (product.openFoodFacts)
// or a Mongo doc (product.raw.openFoodFacts).
function offOf(product) {
  return product?.raw?.openFoodFacts ?? product?.openFoodFacts ?? {};
}

// ---------------------------------------------------------------------------
// 2) DERIVE TAGS + REASONS for one product
// ---------------------------------------------------------------------------
function deriveTags(product) {
  const off = offOf(product);
  const env = off.environment ?? {};
  const nut = off.nutrition ?? {};
  const found = new Set();

  for (const code of env.labels ?? []) if (LABEL_MAP[code]) found.add(LABEL_MAP[code]);
  for (const code of env.packagingTags ?? []) if (PACKAGING_MAP[code]) found.add(PACKAGING_MAP[code]);

  if (env.grade === 'a' || env.grade === 'b') found.add('eco-score-high');
  if (env.grade === 'd' || env.grade === 'e') found.add('eco-score-low');

  if (nut.novaGroup === 1) found.add('minimally-processed');
  if (nut.novaGroup === 4) found.add('ultra-processed');

  return [...found];
}

// Reason chips for the UI — positive first, each with label + polarity.
function greenReasons(product) {
  return deriveTags(product)
    .map((tag) => ({ tag, ...TAGS[tag] }))
    .sort((a, b) => (a.polarity === b.polarity ? 0 : a.polarity === 'positive' ? -1 : 1));
}

// ---------------------------------------------------------------------------
// 3) GREEN SCORE  (environment-focused, 0-100) + availability flag
// ---------------------------------------------------------------------------
function greenScore(product) {
  const off = offOf(product);
  const env = off.environment ?? {};
  const tags = deriveTags(product);

  // base: eco grade if we have it; else neutral IF there is any green signal
  let base = GRADE_TO_SCORE[env.grade];
  const available = base != null || tags.length > 0;
  if (base == null) base = tags.length > 0 ? NEUTRAL_BASE : null;

  if (base == null) {
    return { score: null, available: false, tags: [] }; // no green data at all
  }

  const adjustment = tags.reduce((sum, t) => sum + (TAGS[t]?.weight ?? 0), 0);
  const score = Math.max(0, Math.min(100, Math.round(base + adjustment)));
  return { score, available, tags };
}

// ---------------------------------------------------------------------------
// 4) RANKING + FILTERING for a product list
// ---------------------------------------------------------------------------

// Greenest first. Products with no green data sink to the bottom (score = -1).
function rankByGreen(products) {
  return [...products]
    .map((p) => ({ product: p, green: greenScore(p) }))
    .sort((a, b) => (b.green.score ?? -1) - (a.green.score ?? -1))
    .map((x) => ({ ...x.product, greenScore: x.green.score, greenAvailable: x.green.available }));
}

// Opt-in "green only" filter.
//   minScore       : keep products at/above this green score (default 60 ~ eco C+)
//   requirePositive: also require at least one positive green tag
//   includeUnknown : keep products with no green data (default false)
function filterGreen(products, { minScore = 60, requirePositive = false, includeUnknown = false } = {}) {
  return products.filter((p) => {
    const g = greenScore(p);
    if (g.score == null) return includeUnknown;
    if (g.score < minScore) return false;
    if (requirePositive && !g.tags.some((t) => TAGS[t]?.polarity === 'positive')) return false;
    return true;
  });
}

module.exports = {
  TAGS, // the vocabulary (hand to Member 3)
  deriveTags,
  greenReasons,
  greenScore,
  rankByGreen,
  filterGreen,
};
