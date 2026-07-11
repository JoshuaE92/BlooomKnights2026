# `ecoscoreDetails` — shape contract

Lives at `product.raw.openFoodFacts.ecoscoreDetails` (after `npm run seed` loads `products.json` into Mongo). Populated by `bloomKnights26/scripts/enrichEcoscoreDetails.js`.

## Why this exists

The eco grade/score alone (`environment.grade`, `environment.score`) tells you *what* a product scored but not *why*. This object carries the itemized breakdown OFF's Eco-Score computes it from, so downstream code (synthesis, reason chips) can explain a score instead of just displaying it.

## Shape

```ts
type EcoscoreDetails =
  | { available: false }
  | {
      available: true;
      grade: "a" | "b" | "c" | "d" | "e" | null; // null if OFF has no real grade for this product
      agribalyse: AgribalyseData | null; // null if no life-cycle-assessment match exists
      adjustments: {
        packaging: PackagingAdjustment | null;
        origins: OriginsAdjustment | null;
        productionSystem: ProductionSystemAdjustment | null;
        hasThreatenedSpeciesImpact: boolean;
      };
    };

type AgribalyseData = {
  carbonFootprintTotal: number | null;       // kg CO2e per kg of product
  carbonFootprintByStage: {
    agriculture: number | null;
    processing: number | null;
    packaging: number | null;
    transportation: number | null;
    distribution: number | null;
    consumption: number | null;
  };
  lifeCycleScore: number | null;              // 0-100, OFF's base LCA score before adjustments
  foodCategory: string | null;                // OFF's matched reference category, e.g. "Tomato sauce, with onions, prepacked"
};

type PackagingAdjustment = {
  pointAdjustment: number | null;             // signed delta applied to the eco-score (e.g. -2)
  materialScore: number | null;               // 0-100 material recyclability score
  hasNonRecyclableMaterial: boolean;
  materials: string[];                        // e.g. ["en:glass"], ["en:plastic"] — empty if unknown
  dataAvailable: boolean;                     // false if OFF had no packaging material data at all
};

type OriginsAdjustment = {
  pointAdjustment: number | null;
  usTransportationScore: number | null;       // 0 = no transport penalty data for US; not necessarily "good"
  knownOrigins: string[];                     // e.g. ["en:france"] — empty if unknown
  dataAvailable: boolean;
};

type ProductionSystemAdjustment = {
  pointAdjustment: number | null;
  labels: string[];                           // e.g. ["en:organic", "en:fair-trade"] — empty if none
  dataAvailable: boolean;
};
```

## Real examples

**Rich case** (Rao's Marinara, UPC 747479000079, grade A):
```json
{
  "available": true,
  "grade": "a",
  "agribalyse": {
    "carbonFootprintTotal": 1.47,
    "carbonFootprintByStage": {
      "agriculture": 0.246, "processing": 0.168, "packaging": 0.649,
      "transportation": 0.338, "distribution": 0.0478, "consumption": 0.0181
    },
    "lifeCycleScore": 90,
    "foodCategory": "Tomato sauce, with onions, prepacked"
  },
  "adjustments": {
    "packaging": { "pointAdjustment": -2, "materialScore": 81, "hasNonRecyclableMaterial": false, "materials": ["en:glass"], "dataAvailable": true },
    "origins": { "pointAdjustment": -5, "usTransportationScore": 0, "knownOrigins": [], "dataAvailable": false },
    "productionSystem": { "pointAdjustment": 0, "labels": [], "dataAvailable": false },
    "hasThreatenedSpeciesImpact": false
  }
}
```

**Sparse case** (Barilla Spaghetti, UPC 076808280081, no real grade — common for US products in OFF):
```json
{
  "available": true,
  "grade": null,
  "agribalyse": null,
  "adjustments": {
    "packaging": { "pointAdjustment": -10, "materialScore": 0, "hasNonRecyclableMaterial": false, "materials": [], "dataAvailable": false },
    "origins": { "pointAdjustment": -5, "usTransportationScore": 0, "knownOrigins": [], "dataAvailable": false },
    "productionSystem": { "pointAdjustment": 0, "labels": [], "dataAvailable": false },
    "hasThreatenedSpeciesImpact": false
  }
}
```

## Consuming this data

- **Always check `available` first.** `{ available: false }` means the product had no `upc` or wasn't found on OFF at all — different from a product that *was* found but has sparse data (which still returns `available: true` with mostly-null/`dataAvailable: false` sub-fields).
- **Check each section's own `dataAvailable`/non-null state before using it.** Roughly half of products will have `agribalyse: null` and most `dataAvailable: false` adjustment sections — this is expected, not a bug. Do not treat a missing field as "bad" — treat it as "unknown," and don't fabricate a reason from it.
- **`materials`, `knownOrigins`, `labels` arrays being empty is a real, common state** — don't render an empty reason chip; skip that reason entirely if the underlying array/field is empty.
- Coverage stats as of this enrichment run: run `node scripts/enrichEcoscoreDetails.js` output for exact counts (`Enriched X, no ecoscore data Y, not found Z`).

## Re-running

The enrichment script is idempotent — it skips any product that already has `ecoscoreDetails`, so re-running only fills gaps (new products added since the last run, or ones that errored out). To force a full re-enrichment, delete the `ecoscoreDetails` key from `products.json` first.
