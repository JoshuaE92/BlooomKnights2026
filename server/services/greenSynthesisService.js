const env = require('../config/env');
const Product = require('../models/Product');
const { synthesizeGreenBenefits } = require('./geminiClient');
const { getArticlesForTags } = require('./articleStore');

// GREEN SYNTHESIS
//   1. Look up the product and its tags.
//   2. Load the reference articles we have for those tags (data/articles/).
//   3. Ask Gemini to synthesize a benefits summary grounded in the articles
//      (plus the product's Open Food Facts nutrition/eco grades when present).
//      Mock fallback if Gemini is off/unavailable — same return shape.
//
// Return shape:
//   { product, summary, tagHighlights, sourcedTags, source }
//   sourcedTags = tags that actually had a reference article behind them.

// Pull the small, human-meaningful facts out of the scraped Open Food Facts
// blob — the LLM (and the mock) get grades, not the whole raw record.
function extractFacts(raw) {
  const off = raw?.openFoodFacts;
  if (!off?.matched) return {};
  return {
    nutriScoreGrade: off.nutrition?.nutriScoreGrade || null,
    ecoGrade: off.environment?.grade || null,
  };
}

// --- mock fallback: honest, no AI required ----------------------------------
const GRADE_WORDS = { a: 'excellent', b: 'good', c: 'moderate', d: 'low', e: 'poor' };

function mockSynthesis(product, facts) {
  const tagHighlights = product.tags.map((tag) => ({
    tag,
    benefit: `Matches your search for ${tag}.`,
  }));

  const parts = [];
  if (facts.ecoGrade) {
    parts.push(`an ${GRADE_WORDS[facts.ecoGrade] || facts.ecoGrade}-rated environmental score (eco-grade ${facts.ecoGrade.toUpperCase()})`);
  }
  if (facts.nutriScoreGrade) {
    parts.push(`a Nutri-Score of ${facts.nutriScoreGrade.toUpperCase()} (${GRADE_WORDS[facts.nutriScoreGrade] || 'unrated'} nutritional profile)`);
  }

  const summary = parts.length
    ? `${product.name} has ${parts.join(' and ')}.`
    : `${product.name} doesn't have environmental or nutrition data available yet — check the tags for what it offers.`;

  return { summary, tagHighlights };
}

// --- public entry point -----------------------------------------------------
async function synthesize(productId) {
  const doc = await Product.findById(productId).lean();
  if (!doc) return null;

  const { _id, __v, raw, ...rest } = doc;
  const product = { id: _id, ...rest }; // response product stays raw-free
  const facts = extractFacts(raw);

  const articles = await getArticlesForTags(product.tags || []);

  let synthesis;
  let source = 'mock';

  if (env.AI_MODE === 'live' && env.GEMINI_API_KEY) {
    try {
      synthesis = await synthesizeGreenBenefits({ product, facts, articles });
      source = 'gemini';
    } catch (err) {
      console.warn('[greenSynthesis] Gemini failed, using mock:', err.message);
    }
  }
  if (!synthesis || !synthesis.summary) {
    synthesis = mockSynthesis(product, facts);
    source = 'mock';
  }

  return {
    product,
    summary: synthesis.summary,
    tagHighlights: synthesis.tagHighlights,
    sourcedTags: articles.map((a) => a.tag),
    source,
  };
}

module.exports = { synthesize };
