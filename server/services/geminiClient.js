import { env } from '../config/env.js';

// Raw Gemini call — ONE job: turn a user's recipe/request into a list of
// grocery items to shop for. It does NOT see the catalog and does NOT pick
// products (our code searches the stores and picks the greenest). This keeps
// the prompt tiny and scales no matter how many products exist.
//
// Throws on any failure so aiService can fall back to the mock.

const MODEL = 'gemini-3.5-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export async function identifyNeededItems({ prompt, maxItems = 6 }) {
  const instruction =
    `You are a sustainable-grocery assistant. Given a user's recipe or shopping request, ` +
    `list the grocery items needed to fulfill it (up to ${maxItems}). ` +
    `Use short, searchable grocery names, e.g. "black beans", "corn tortillas", "brown rice". ` +
    `Also write a one-sentence friendly summary. Respond as JSON.`;

  const body = {
    systemInstruction: { parts: [{ text: instruction }] },
    contents: [{ role: 'user', parts: [{ text: `User request: "${prompt}"` }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          neededItems: { type: 'array', items: { type: 'string' } },
          summary: { type: 'string' },
        },
        required: ['neededItems', 'summary'],
      },
    },
  };

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': env.geminiApiKey,
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

  const parsed = JSON.parse(text);
  return {
    neededItems: parsed.neededItems || [],
    summary: parsed.summary || '',
  };
}
