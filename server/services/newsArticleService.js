const env = require('../config/env');

// "Learn more about why this matters" — current articles for each canonical
// green tag (organic, fair-trade, recyclable-packaging, ...). Uses the GNews
// API (free tier: 100 req/day) with a 24h in-memory cache per tag, so at most
// one upstream call per tag per day regardless of traffic.
//
// No GNEWS_API_KEY -> every tag resolves to [] (frontend hides the section).
//
// NOTE: distinct from articleStore.js, which serves the LOCAL plaintext
// articles that ground Green Synthesis. These are external links for users.

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // refresh daily
const MAX_ARTICLES_PER_TAG = 3;
const cache = new Map(); // tag -> { articles, fetchedAt }

// "recyclable-packaging" -> search "recyclable packaging sustainability"
const tagToQuery = (tag) => `"${tag.replace(/-/g, ' ')}" sustainability`;

async function fetchArticlesForTag(tag) {
  const url =
    `https://gnews.io/api/v4/search` +
    `?q=${encodeURIComponent(tagToQuery(tag))}` +
    `&lang=en&max=${MAX_ARTICLES_PER_TAG}&sortby=relevance` +
    `&apikey=${env.GNEWS_API_KEY}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`GNews ${res.status}`);

  const data = await res.json();
  return (data.articles || []).map((a) => ({
    title: a.title,
    url: a.url,
    source: a.source?.name || null,
    publishedAt: a.publishedAt || null,
  }));
}

// tags: ["organic", "fair-trade"] -> { organic: [{title,url,source,publishedAt}], ... }
async function getArticlesByTags(tags = []) {
  const result = {};

  await Promise.all(
    tags.map(async (tag) => {
      const cached = cache.get(tag);
      if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        result[tag] = cached.articles;
        return;
      }

      if (!env.GNEWS_API_KEY) {
        result[tag] = [];
        return;
      }

      try {
        const articles = await fetchArticlesForTag(tag);
        cache.set(tag, { articles, fetchedAt: Date.now() });
        result[tag] = articles;
      } catch (err) {
        console.warn(`[newsArticles] fetch failed for "${tag}":`, err.message);
        // Serve stale cache over nothing; otherwise empty.
        result[tag] = cached?.articles || [];
      }
    })
  );

  return result;
}

module.exports = { getArticlesByTags };
