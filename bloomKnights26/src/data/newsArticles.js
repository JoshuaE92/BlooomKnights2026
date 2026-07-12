// Curated "In the News" articles for the Home carousel — real, current links.
// Mirrors server/data/articles/curated-links.json, flattened + given a visual
// theme (emoji + gradient) so each card has art without external images.
export const NEWS_ARTICLES = [
  {
    id: "plastic-packaging",
    badge: null,
    title: "Single-use plastics are a top ocean polluter — and packaging is the biggest source.",
    source: "FoodPrint",
    url: "https://foodprint.org/reports/the-foodprint-of-food-packaging/",
    emoji: "♻️",
    gradient: ["#00ABE7", "#3DA35D"],
  },
  {
    id: "beef-lentils",
    badge: "TIP",
    title: "Swap beef for lentils once a week — cut ~35% of your diet's emissions.",
    source: "Physicians Committee",
    url: "https://www.pcrm.org/news/news-releases/swapping-meat-and-dairy-plant-based-foods-cuts-climate-pollution-35-randomized",
    emoji: "🥗",
    gradient: ["#3DA35D", "#FF8600"],
  },
  {
    id: "organic",
    badge: null,
    title: "Organic farms support ~30% more species and cut water pollution by up to 75%.",
    source: "Organic Voices",
    url: "https://www.organicvoices.org/the-environmental-benefits-of-going-organic-a-deep-dive-for-earth-day/",
    emoji: "🌱",
    gradient: ["#3DA35D", "#00ABE7"],
  },
  {
    id: "un-food",
    badge: "TIP",
    title: "The UN's guide to lowering your food carbon footprint, one meal at a time.",
    source: "United Nations",
    url: "https://www.un.org/en/actnow/food",
    emoji: "🌍",
    gradient: ["#00ABE7", "#3DA35D"],
  },
  {
    id: "fair-trade",
    badge: null,
    title: "What the Fair Trade label actually protects — farmers, forests, and fair pay.",
    source: "Fair Trade Certified",
    url: "https://www.fairtradecertified.org/why-fair-trade/issues/environment/",
    emoji: "🤝",
    gradient: ["#FF8600", "#3DA35D"],
  },
  {
    id: "seafood",
    badge: null,
    title: "How your seafood choices help end overfishing and protect oceans.",
    source: "WWF",
    url: "https://wwf.panda.org/act/live_green/out_shopping/seafood/",
    emoji: "🐟",
    gradient: ["#00ABE7", "#0077A8"],
  },
];
