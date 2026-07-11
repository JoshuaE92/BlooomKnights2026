// Adapter over Member 1's greenReasons(product) helper.
//
// Member 1 owns server/utils/greenReasons.js + the canonical tag vocabulary.
// Until that lands, this file provides a minimal fallback with the SAME
// contract, so synthesis (Member 3) can ship now:
//
//   getReasons(product) -> [{ tag, label, polarity: 'positive'|'negative' }]
//
// When utils/greenReasons.js appears, it is picked up automatically — the
// fallback below simply stops being used. Nothing here needs editing.

let memberOneGreenReasons = null;
try {
  // eslint-disable-next-line global-require
  ({ greenReasons: memberOneGreenReasons } = require('../utils/greenReasons'));
} catch {
  // Member 1's module not merged yet — fallback below is used.
}

// --- minimal fallback (subset of the planned vocabulary) --------------------
const LABEL_CHIPS = {
  'en:organic': { tag: 'organic', label: 'Organic certified', polarity: 'positive' },
  'en:fair-trade': { tag: 'fair-trade', label: 'Fair trade', polarity: 'positive' },
  'en:non-gmo-project': { tag: 'non-gmo', label: 'Non-GMO Project verified', polarity: 'positive' },
  'en:no-gmos': { tag: 'non-gmo', label: 'No GMOs', polarity: 'positive' },
  'en:vegan': { tag: 'vegan', label: 'Vegan', polarity: 'positive' },
  'en:vegetarian': { tag: 'vegetarian', label: 'Vegetarian', polarity: 'positive' },
};

const PACKAGING_CHIPS = {
  'en:glass': { tag: 'recyclable-packaging', label: 'Recyclable glass', polarity: 'positive' },
  'en:card-box': { tag: 'recyclable-packaging', label: 'Cardboard packaging', polarity: 'positive' },
  'en:cardboard': { tag: 'recyclable-packaging', label: 'Cardboard packaging', polarity: 'positive' },
  'en:paper': { tag: 'recyclable-packaging', label: 'Paper packaging', polarity: 'positive' },
  'en:plastic': { tag: 'plastic-packaging', label: 'Plastic packaging', polarity: 'negative' },
};

function fallbackReasons(product) {
  const off = product.raw?.openFoodFacts;
  if (!off?.matched) return [];

  const chips = [];
  const seen = new Set();
  const push = (chip) => {
    if (chip && !seen.has(chip.tag + chip.label)) {
      seen.add(chip.tag + chip.label);
      chips.push(chip);
    }
  };

  const ecoGrade = off.environment?.grade;
  if (ecoGrade === 'a' || ecoGrade === 'b') {
    push({ tag: 'low-eco-impact', label: `Low environmental impact (eco-grade ${ecoGrade.toUpperCase()})`, polarity: 'positive' });
  } else if (ecoGrade === 'd' || ecoGrade === 'e') {
    push({ tag: 'high-eco-impact', label: `Higher environmental impact (eco-grade ${ecoGrade.toUpperCase()})`, polarity: 'negative' });
  }

  for (const label of off.environment?.labels || []) push(LABEL_CHIPS[label]);
  for (const pkg of off.environment?.packagingTags || []) push(PACKAGING_CHIPS[pkg]);

  const nova = off.nutrition?.novaGroup;
  if (nova === 1) push({ tag: 'minimally-processed', label: 'Minimally processed', polarity: 'positive' });
  if (nova === 4) push({ tag: 'ultra-processed', label: 'Ultra-processed', polarity: 'negative' });

  const nutri = off.nutrition?.nutriScoreGrade;
  if (nutri === 'a' || nutri === 'b') {
    push({ tag: 'healthy-choice', label: `Nutri-Score ${nutri.toUpperCase()}`, polarity: 'positive' });
  }

  return chips;
}

function getReasons(product) {
  return (memberOneGreenReasons || fallbackReasons)(product);
}

module.exports = { getReasons };
