const { readFile } = require('node:fs/promises');
const path = require('node:path');

// Reference articles for Green Synthesis. One plaintext file per tag lives in
// server/data/articles/<tag>.txt (e.g. organic.txt, grass-fed.txt). Missing
// files are fine — synthesis simply proceeds with whatever articles exist.
//
// Swap point: later these could come from a CMS or a vector store; callers
// only depend on getting back [{ tag, text }].

const ARTICLES_DIR = path.join(__dirname, '..', 'data', 'articles');

// Cap how much of each article goes into the prompt — keeps Gemini calls
// small even if someone drops a 50-page document in the folder.
const MAX_CHARS_PER_ARTICLE = 4000;

// Tags become filenames via slugify ("dry pasta" -> dry-pasta.txt). Anything
// that isn't a-z/0-9 collapses to a dash, which also blocks path tricks
// like "../secrets".
const slugify = (tag) =>
  String(tag).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

async function getArticlesForTags(tags = []) {
  const articles = await Promise.all(
    tags.map(async (tag) => {
      const slug = slugify(tag);
      if (!slug) return null;
      try {
        const text = await readFile(path.join(ARTICLES_DIR, `${slug}.txt`), 'utf-8');
        return { tag, text: text.trim().slice(0, MAX_CHARS_PER_ARTICLE) };
      } catch {
        return null; // no article for this tag — that's allowed
      }
    })
  );
  return articles.filter(Boolean);
}

module.exports = { getArticlesForTags };
