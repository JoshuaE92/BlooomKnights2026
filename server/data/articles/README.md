# Green Synthesis reference articles

One plaintext file per product tag. The filename is the tag **slugified** —
lowercase with anything that isn't a letter/number collapsed to a dash:

| Product tag          | Filename                |
|----------------------|-------------------------|
| `pasta`              | `pasta.txt`             |
| `dry pasta`          | `dry-pasta.txt`         |
| `spaghetti noodles`  | `spaghetti-noodles.txt` |
| `organic`            | `organic.txt`           |

When Green Synthesis runs for a product (`GET /api/products/:id/green-synthesis`),
the articles matching its tags are loaded and given to Gemini as the source
material for the benefits summary. Missing articles are fine — synthesis uses
whatever exists (only the first ~4000 characters of each file are sent, so keep
them short or lead with the important part).
