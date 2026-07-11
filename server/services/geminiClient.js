const env = require('../config/env');

// Raw Gemini calls. Each exported function has ONE job and a fixed JSON
// response shape. Throws on any failure so callers can fall back to mocks.

const MODEL = 'gemini-3.5-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

// Shared plumbing: instruction + user text in, schema-validated JSON out.
async function callGemini({ instruction, userText, responseSchema }) {
  const body = {
    systemInstruction: { parts: [{ text: instruction }] },
    contents: [{ role: 'user', parts: [{ text: userText }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema,
    },
  };

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': env.GEMINI_API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Gemini API ${res.status}: ${detail.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned no content');

  return JSON.parse(text);
}

// Turn a user's recipe/request into a list of grocery items to shop for.
// It does NOT see the catalog and does NOT pick products (our code searches
// the stores and picks the greenest). This keeps the prompt tiny and scales
// no matter how many products exist.
async function identifyNeededItems({ prompt, maxItems = 6 }) {
  const instruction =
    `You are a sustainable-grocery assistant. Given a user's recipe or shopping request, ` +
    `list the grocery items needed to fulfill it (up to ${maxItems}). ` +
    `Use short, searchable grocery names, e.g. "black beans", "corn tortillas", "brown rice". ` +
    `Also write a one-sentence friendly summary. Respond as JSON.`;

  const parsed = await callGemini({
    instruction,
    userText: `User request: "${prompt}"`,
    responseSchema: {
      type: 'object',
      properties: {
        neededItems: { type: 'array', items: { type: 'string' } },
        summary: { type: 'string' },
      },
      required: ['neededItems', 'summary'],
    },
  });

  return {
    neededItems: parsed.neededItems || [],
    summary: parsed.summary || '',
  };
}

// GREEN SYNTHESIS: given one product, its tags, and reference articles about
// those tags, write a grounded summary of why this product's attributes are
// beneficial (environment/health). The articles are the source of truth —
// Gemini synthesizes, it doesn't invent facts.
async function synthesizeGreenBenefits({ product, facts = {}, articles }) {
  const instruction =
    `You are a sustainable-grocery assistant. You will get one grocery product, ` +
    `its tags, optional nutrition/environment grades, and reference articles about those tags. ` +
    `Write a short, friendly summary (2-4 sentences) of the health and environmental benefits ` +
    `of buying THIS product, grounded ONLY in the provided articles and grades — do not invent claims. ` +
    `Also give one concise benefit line per tag. If a tag has no article, use common knowledge ` +
    `but keep it modest and generic. Respond as JSON.`;

  const articleBlock = articles.length
    ? articles.map((a) => `--- ARTICLE (tag: ${a.tag}) ---\n${a.text}`).join('\n\n')
    : '(no articles available)';

  const factLines = [
    facts.nutriScoreGrade ? `Nutri-Score: ${facts.nutriScoreGrade.toUpperCase()}` : null,
    facts.ecoGrade ? `Eco-grade: ${facts.ecoGrade.toUpperCase()}` : null,
  ].filter(Boolean);

  const userText =
    `PRODUCT: ${product.name} (${product.unit || 'n/a'}) — $${product.price}\n` +
    `TAGS: ${product.tags.join(', ')}\n` +
    (factLines.length ? `GRADES: ${factLines.join(', ')}\n` : '') +
    `\nREFERENCE ARTICLES:\n${articleBlock}`;

  const parsed = await callGemini({
    instruction,
    userText,
    responseSchema: {
      type: 'object',
      properties: {
        summary: { type: 'string' },
        tagHighlights: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              tag: { type: 'string' },
              benefit: { type: 'string' },
            },
            required: ['tag', 'benefit'],
          },
        },
      },
      required: ['summary', 'tagHighlights'],
    },
  });

  return {
    summary: parsed.summary || '',
    tagHighlights: parsed.tagHighlights || [],
  };
}

// GREEN EXPLANATION (per AI pick): one grounded sentence on why this product
// is the greener choice. Facts come from Member 1's reason chips and (when
// backfilled) Member 2's ecoscoreDetails — the model phrases them, nothing more.
async function explainGreenPick({ product, reasons, ecoscoreDetails }) {
  const instruction =
    `You are a sustainable-grocery assistant. Write EXACTLY ONE friendly sentence ` +
    `explaining why this product is a greener/better choice. ` +
    `Use ONLY the provided facts — do not invent claims, numbers, or certifications. ` +
    `If the facts include negatives, you may acknowledge one honestly. Respond as JSON.`;

  const reasonLines = (reasons || [])
    .map((r) => `- (${r.polarity}) ${r.label}`)
    .join('\n');

  const userText =
    `PRODUCT: ${product.name} — $${product.price}\n` +
    `FACTS:\n${reasonLines || '(none)'}\n` +
    (ecoscoreDetails
      ? `ECO-SCORE BREAKDOWN: ${JSON.stringify(ecoscoreDetails).slice(0, 1500)}\n`
      : '');

  const parsed = await callGemini({
    instruction,
    userText,
    responseSchema: {
      type: 'object',
      properties: { explanation: { type: 'string' } },
      required: ['explanation'],
    },
  });

  return parsed.explanation || '';
}

module.exports = { identifyNeededItems, synthesizeGreenBenefits, explainGreenPick };
