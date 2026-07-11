# BloomKnights — Database Schema (for MongoDB)

3 collections: **products**, **stores**, **recipequeries**.
Convention: we use the human-readable slug as `_id` (e.g. `"walmart"`), not a random ObjectId, so keys stay stable across data sources.

---

## `products`

| Field   | Type            | Required | Notes                                                        |
|---------|-----------------|----------|--------------------------------------------------------------|
| `_id`   | String (slug)   | ✅       | e.g. `"walmart-organic-black-beans-15oz"`                    |
| `name`  | String          | ✅       | Display name                                                 |
| `store` | String          | ✅       | Store slug this product belongs to (`"walmart"`, `"costco"`) |
| `price` | Number          | ✅       | Dollars                                                      |
| `unit`  | String          | ⬜       | e.g. `"15 oz can"`                                           |
| `tags`  | [String]        | ⬜       | e.g. `["organic","local","vegan"]` — drives green score      |
| `raw`   | Mixed (any)     | ⬜       | Catch-all for scraped/API fields not yet formalized          |

**Example document:**
```json
{
  "_id": "walmart-organic-black-beans-15oz",
  "name": "Organic Black Beans",
  "store": "walmart",
  "price": 1.98,
  "unit": "15 oz can",
  "tags": ["organic", "canned", "vegan", "local"]
}
```

---

## `stores`

| Field      | Type          | Required | Notes                                  |
|------------|---------------|----------|----------------------------------------|
| `_id`      | String (slug) | ✅       | e.g. `"walmart"`                       |
| `name`     | String        | ✅       | Display name                           |
| `location` | String        | ⬜       | Address / area                         |
| `zipcodes` | [String]      | ⬜       | Zipcodes this store serves             |
| `raw`      | Mixed (any)   | ⬜       | Catch-all                              |

**Example document:**
```json
{
  "_id": "walmart",
  "name": "Walmart Supercenter",
  "location": "1200 Main St",
  "zipcodes": ["10001", "10002", "07030"]
}
```

---

## `recipequeries`  (a user's AI query + result — "chat history")

| Field    | Type          | Required | Notes                                                            |
|----------|---------------|----------|------------------------------------------------------------------|
| `_id`    | ObjectId      | auto     | Mongo generates this one                                         |
| `userId` | String        | ✅       | **For now** a string. Change to `ObjectId` ref → `User` once auth is in |
| `prompt` | String        | ✅       | What the user typed                                              |
| `result` | Mixed (any)   | ⬜       | The AI output: `{ picks, totalCost, avgGreenImpact, summary }`   |
| `createdAt` / `updatedAt` | Date | auto  | Mongoose timestamps                                              |

**Example document:**
```json
{
  "userId": "u1",
  "prompt": "beans and rice for tacos",
  "result": {
    "picks": [ { "id": "walmart-organic-black-beans-15oz", "name": "Organic Black Beans", "greenImpact": 90 } ],
    "totalCost": 33.52,
    "avgGreenImpact": 76,
    "summary": "Picked 5 greener items..."
  }
}
```

---

## Notes for whoever sets up MongoDB
- **Only `name`, `store`, `price` are hard-required on products** — everything else is optional so partial/scraped data still saves.
- Indexes worth adding: `products.store`, `stores.zipcodes`, `recipequeries.userId`.
- The `raw` field lets us store new scraped fields without changing the schema — promote them to real fields later.
- Mongoose models already exist in `server/models/` and a `npm run seed` script loads the mock data. **Just send the `MONGO_URI`** and it's ready to populate.
