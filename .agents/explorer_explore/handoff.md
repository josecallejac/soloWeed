# Brand Cleanup Investigation Report

## Summary
Analysis of the `soloWeed` SQLite database and codebase reveals significant brand name capitalization discrepancies, spacing differences, typographical errors (e.g., `Clipepr`, `G-ROLZZ`), and a set of false positive brandKey mappings caused by simple substring/token matching in product titles, URLs, and descriptions (e.g., mapping `Squadafum` to `clipper` because the word "clipper" appears in the description text). 19 products and 36 offers also have a non-null `brandKey` but a `NULL` `brand` name. We recommend applying a standardized database cleanup mapping and refining the brand key backfill heuristics.

---

## 1. Observation

### A. Database Structure (Tables & Columns)
From `E:\soloWeed\prisma\schema.prisma`, lines 26-47 (`Product` model) and lines 49-84 (`Offer` model):
```prisma
model Product {
  id             Int      @id @default(autoincrement())
  brand          String?
  brandKey       String?
  ...
}

model Offer {
  id              Int      @id @default(autoincrement())
  brand           String?
  brandKey        String?
  ...
}
```
Thus, brand names and brand keys are stored in:
1. `Product.brand` (display brand name)
2. `Product.brandKey` (canonical key identifier)
3. `Offer.brand` (offer-specific scraped brand name)
4. `Offer.brandKey` (offer-specific resolved brand key)

### B. Database Statistics
We executed a Python script directly on the active database `E:\soloWeed\prisma\dev.db` and obtained the following values:
*   **Total Products**: 372
*   **Total Offers**: 1,443
*   **Total Stores**: 4
*   **Product Brand NULL count**: 19 / 372
*   **Product brandKey NULL count**: 0 / 372 (every product has a resolved key)
*   **Offer Brand NULL count**: 118 / 1443
*   **Offer brandKey NULL count**: 149 / 1443
*   **Product Distinct Brands**: 78
*   **Product Distinct Brand Keys**: 50
*   **Offer Distinct Brands**: 134
*   **Offer Distinct Brand Keys**: 52

**Store-wise Breakdown**:
*   `Astro Growshop (astrogrowshop)`: 450 offers | 46 distinct brands | 32 distinct brand keys
*   `Fumetas (fumetas)`: 518 offers | 86 distinct brands | 43 distinct brand keys
*   `Piranha (piranha)`: 236 offers | 33 distinct brands | 34 distinct brand keys
*   `GrowBarato Chile (growbarato)`: 239 offers | 24 distinct brands | 26 distinct brand keys

### C. Inconsistencies & Anomalies
We queried all distinct brand name to brand key pairs. Below are verbatim findings from the SQLite output (logged to `aggregate_mappings.txt`):
1.  **Casing Variations**:
    *   `brandKey: bonglab` maps to `'BONGLAB'` (40 products), `'BongLab'` (17 products), `'Bonglab'` (4 products), and `'bonglab'` (3 products).
    *   `brandKey: blazy-susan` maps to `'BLAZY SUSAN'` (16 products) and `'Blazy Susan'` (10 products).
    *   `brandKey: calvo` maps to `'CALVO'` (6 products), `'Calvo'` (2 products), `'Calvo Glass'` (3 products), and `'calvo'` (1 product).
    *   `brandKey: storz-bickel` maps to `'STORZ & BICKEL'`, `'STORZ BICKEL'`, and `'Storz & Bickel'`.
    *   `brandKey: raw` maps to `'RAW'`, `'Raw'`, and `'raw'`.
2.  **Typos in raw brands**:
    *   `brandKey: clipper` maps to `'Clipepr'` (1 offer).
    *   `brandKey: g-rollz` maps to `'G-ROLZZ'` (1 offer).
3.  **NULL Brand Names with Populated Brand Keys**:
    *   19 products and 36 offers have `brand = NULL` but `brandKey` is set (e.g., Product 8651: `name = 'Davinci Miqro-C | Vaporizador portátil'`, `brand = NULL`, `brandKey = 'davinci'`).
4.  **Incorrect mappings (heuristics-driven false positives)**:
    *   *Description/substring match issue*: Offer 4663 (`'Squadafum Moledor Pot Grinder 50mm'`, Brand: `Squadafum`) and Offer 8164 (`'Taza Pipa 385ml - Diseños'`, Brand: `HighTimes`) are mapped to `brandKey: clipper` because their descriptions contain the word "clipper" (e.g. "...e incluso hasta un clipper...").
    *   *Co-branded lighters*: Product 5729 (`'Encendedor Clipper The Bulldog Amsterdam'`, Brand: `Clipper`) is mapped to `brandKey: the-bulldog`.
    *   *Wrong scraper labels*: Offer 1219 and 1528 (`'Calvo Glass Banger...'`) are scraped under Brand `Bonglab`, but mapped to `brandKey: calvo`.
    *   *Detox mappings*: Product 9547 (`'Kleaner 30 Ml Detox  Limpiador De Toxinas'`, Brand: `ZYDOT`) is mapped to `brandKey: kleaner`.
    *   *Category collision*: Offer 2082 (`'Blunt Kush Hemp Wrap x2'`, Brand: `Kush Hemp`) mapped to `brandKey: blunt-wrap` because tokenized "blunt wrap" overlaps with the name.

---

## 2. Logic Chain

1.  **Finding**: The schema uses two fields: a nullable display `brand` string and a resolved `brandKey` string.
2.  **Finding**: Substrings/tokens inside the text fields (`title`, `description`, `url`, `sourceCategory`) are matched sequentially against a hardcoded list of brand phrases.
    *   *Step 1*: If an offer's description mentions a competitor brand or an accessory brand (e.g. "includes a Clipper lighter" in a pipe's description), the token matches and returns that brand's key. This explains why `Squadafum` and `HighTimes` products got mapped to `clipper`.
    *   *Step 2*: If a product features another brand's design (e.g. a `Clipper` lighter styled with `The Bulldog` logo), the first keyword in the matching list takes priority, or the compound title triggers a mismatch. This explains Product 5729.
    *   *Step 3*: If a shop lists a product under an incorrect category or with wrong metadata on their site, the scraper imports it verbatim (e.g. `Calvo Glass` rigs listed with brand `Bonglab` on Fumetas, or `Kleaner` listed with brand `ZYDOT` on Astro).
3.  **Conclusion**: A simple database mapping cleanup can resolve existing database records. However, to prevent these issues from recurring on future crawls, the backfilling heuristics (`scripts/backfill-brand-keys.ts` and `scripts/scrape.ts`) must be updated to:
    *   Prioritize explicit brand names from the scraper over title/description search.
    *   Disallow searching the full description text for brand keywords unless verified by a very high score or restricted to specific categories (like vaporizers).
    *   Add exact-match priority rules so that compound names (like "Blunt Kush Hemp Wrap") resolve to `kush-hemp` instead of `blunt-wrap`.

---

## 3. Caveats

*   **Scraper dependency**: We did not run a full scrape because we are in a read-only investigation. The raw data errors on Fumetas and Astro Growshop websites (e.g. categorizing a Kleaner spray under Zydot) will continue to propagate incorrect brand values if scraped again, unless the scraper implements custom overrides.
*   **Prisma Client status**: We bypassed Prisma Client database updates. The database counts are accurate as of the current state of `prisma/dev.db`, but if a migration or auto-curate script has run recently without `brandKey` backfills, some keys might be out of sync.

---

## 4. Conclusion

The SQLite database contains:
1.  **Case discrepancies**: `Bonglab`/`BONGLAB`/`BongLab`/`bonglab` (and similarly for `Calvo`, `Blazy Susan`, `Zippo`, `Storz & Bickel`, etc.).
2.  **Typos**: `Clipepr` and `G-ROLZZ`.
3.  **19 Products / 36 Offers** missing display brand values despite having brandKeys.
4.  **At least 18 Offers** with wrong brandKey mappings due to description text overlap.

### Recommended Standardization Mapping

We recommend applying the following mappings. The canonical name is the display name to write to `brand`, and the canonical key is to write to `brandKey`.

| Raw Brand Name / Value | Target Canonical Brand | Target Canonical brandKey |
| :--- | :--- | :--- |
| `ACTITUBE`, `actitube` | `actiTube` | `actitube` |
| `AIRIS`, `AIRISTECH`, `Airistech` | `Airistech` | `airis` |
| `AMERICAN HELIX`, `American Helix` | `American Helix` | `american-helix` |
| `BLAZY SUSAN`, `Blazy Susan` | `Blazy Susan` | `blazy-susan` |
| `BLUNT WRAP`, `Blunt Wrap` | `Blunt Wrap` | `blunt-wrap` |
| `BONGLAB`, `BongLab`, `Bonglab`, `bonglab` | `Bonglab` | `bonglab` |
| `CABO`, `Cabo` | `Cabo` | `cabo` |
| `CALVO`, `Calvo`, `Calvo Glass`, `CALVO GLASS`, `calvo` | `Calvo Glass` | `calvo` |
| `CLIPPER`, `Clipper`, `Clipepr` | `Clipper` | `clipper` |
| `DA VINCI`, `DaVinci` | `DaVinci` | `davinci` |
| `DYNAVAP`, `Dynavap` | `DynaVap` | `dynavap` |
| `FOCUS V`, `Focus V` | `Focus V` | `focus-v` |
| `FUTUROLA`, `Futurola` | `Futurola` | `futurola` |
| `G-ROLLZ`, `G-Rollz`, `G-ROLZZ` | `G-Rollz` | `g-rollz` |
| `GALAXY`, `Galaxy` | `Galaxy` | `galaxy` |
| `GIZEH`, `Gizeh` | `Gizeh` | `gizeh` |
| `GRAV`, `Grav` | `Grav` | `grav` |
| `HEMPER`, `Hemper` | `Hemper` | `hemper` |
| `KUSH HEMP`, `Kush`, `Kush Hemp` | `Kush Hemp` | `kush-hemp` |
| `LION ROLLING CIRCUS`, `Lion Rolling Circus` | `Lion Rolling Circus` | `lion-rolling-circus` |
| `MJ Arsenal` | `MJ Arsenal` | `mj-arsenal` |
| `OCB` | `OCB` | `ocb` |
| `OZETA`, `OZeta`, `Ozeta` | `Ozeta` | `ozeta` |
| `PIECEMAKER`, `Piece Maker Gear`, `PieceMaker` | `PieceMaker` | `piecemaker` |
| `PUFFCO`, `Puffco` | `Puffco` | `puffco` |
| `RAW`, `Raw`, `raw` | `RAW` | `raw` |
| `RONSON`, `Ronson` | `Ronson` | `ronson` |
| `RYOT`, `Ryot` | `RYOT` | `ryot` |
| `SOULBLIME`, `Soulblime` | `Soulblime` | `soulblime` |
| `STORZ & BICKEL`, `STORZ BICKEL`, `Storz & Bickel` | `Storz & Bickel` | `storz-bickel` |
| `BULLDOG`, `The Bulldog`, `The Bulldog Amsterdam` | `The Bulldog` | `the-bulldog` |
| `TOP SMOKE`, `Top Smoke` | `Top Smoke` | `top-smoke` |
| `VIBES`, `Vibes` | `Vibes` | `vibes` |
| `ZENGAZ`, `Zengaz` | `Zengaz` | `zengaz` |
| `ZIPPO`, `Zippo` | `Zippo` | `zippo` |
| `ZYDOT` | `Zydot` | `zydot` |
| `Squadafum` | `Squadafum` | `squadafum` |
| `HighTimes` | `HighTimes` | `hightimes` |
| `FORMULA 420` | `Formula 420` | `formula-420` |
| `ASTRO` | `Astro Growshop` | `astro` |

*Note on False Positive Corrections*:
*   **Offer 4663**: Change `brandKey` from `clipper` to `squadafum`.
*   **Offer 8164**: Change `brandKey` from `clipper` to `hightimes`.
*   **Offer 2082**: Change `brandKey` from `blunt-wrap` to `kush-hemp`.
*   **Offer 2724**: Change `brandKey` from `ignite` to `top-smoke`.
*   **Product 5729 / Offer 2072**: Change `brandKey` from `the-bulldog` to `clipper` (or model field should handle the Bulldog aspect).
*   **Product 9547 / Offer 1170**: Change `brand` from `ZYDOT` to `Kleaner` and `brandKey` to `kleaner`.
*   **Offer 1219 / 1528**: Change `brand` from `Bonglab` to `Calvo Glass`.
*   **Product 9481 & Offers**: Change `brandKey` from `bonglab` to `re-stash`.

---

## 5. Verification Method

To verify these findings:
1.  **File Inspections**:
    *   Inspect `E:\soloWeed\.agents\explorer_explore\aggregate_mappings.txt` to check the full list of mapped brand names and brandKeys.
    *   Inspect `E:\soloWeed\.agents\explorer_explore\null_brands.txt` to verify the list of products and offers with `brand = NULL` but set `brandKey`.
2.  **Database Queries**:
    Run the following SQLite command using standard SQLite CLI or custom script to verify false positive counts:
    ```sql
    -- Check if description matches for non-Clipper brands result in brandKey='clipper'
    SELECT id, title, brand, description FROM Offer WHERE brandKey = 'clipper' AND brand != 'Clipper' AND brand != 'CLIPPER' AND brand != 'Clipepr';
    ```
    This should return `Offer ID: 4663` and `Offer ID: 8164`.
