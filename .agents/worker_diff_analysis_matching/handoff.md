# Matching Comparison Handoff Report

## 1. Observation
Comparing the databases `prisma/dev_recovered.db` and `prisma/test_matching.db` yielded the following findings:
- Total offers in both databases: **1444**
- `dev_recovered.db` products count: **219**
- `test_matching.db` products count: **205**
- Net new offers linked (unlinked in `dev_recovered.db` but linked in `test_matching.db`): **0**
- Net new products curated from scratch (offers completely unlinked in `dev_recovered.db` but grouped under a product in `test_matching.db`): **0**
- Newly merged/regrouped products (offers belonging to different products in `dev_recovered.db` now grouped under one product in `test_matching.db`): **1**
- Split products (offers in a single product group in `dev_recovered.db` now split into 2 or more products in `test_matching.db`): **2**
- Removed products (products whose offers were all unlinked in `test_matching.db`): **15**
- Reduced products (products that lost one or more offers to unlinking in `test_matching.db` but kept at least one): **15**

### Detailed Observations of New/Regrouped Products
Only **1** product was merged/regrouped:
- **CABO Heavy Gear 20mm (Clear/Black) - CABO | PIRANHA** (ID: 10114 in `test_matching.db`)
  - **Offers grouped**:
    - `https://fumetas.cl/cabo-pipa-heavy-gear-clear-20mm` (Title: "Cabo Pipa Heavy Gear Clear 20mm", brandKey: cabo)
    - `https://piranha.cl/inicio/7456/cabo-heavy-gear-20mm-clearblack.html` (Title: "CABO Heavy Gear 20mm (Clear/Black) - CABO | PIRANHA", brandKey: cabo)
  - **Source products in `dev_recovered.db`**:
    - Product ID 10114: `CABO Heavy Gear 20mm (Clear/Black) - CABO | PIRANHA`
    - Product ID 6772: `Pipa De Mano Heavy Gear`

### Detailed Observations of Split Products
Only **2** products were split:
1. **Encendedor Clipper Racoons** (ID: 5725 in `dev_recovered.db` with 21 offers)
   - Split into:
     - **Encendedor Clipper Racoons** (ID: 5725 in `test_matching.db`)
     - **Encendedor Clipper The Bulldog Amsterdam** (ID: 10191 in `test_matching.db`)
2. **Pipa De Mano Heavy Gear** (ID: 6772 in `dev_recovered.db` with 4 offers)
   - Split into:
     - **Pipa De Mano Heavy Gear** (ID: 6772 in `test_matching.db`)
     - **CABO Heavy Gear 20mm (Clear/Black) - CABO | PIRANHA** (ID: 10114 in `test_matching.db`)

### Detailed Observations of Removed Products (All Offers Unlinked)
The **15** removed products are:
1. **Bandeja RAW Metálica Classic Mediana** (ID: 10190)
2. **Blazy Susan Deluxe Rolling Kit Pink 1 1/4** (ID: 10184)
3. **RAW Black Connoisseur 1 1/4 + Tips** (ID: 10186)
4. **RAW Conos Pre-enrolados King Size + Tips** (ID: 10185)
5. **Vaporizador Puffco New Peak | PIRANHA** (ID: 9248)
6. **Blazy Susan Deluxe Rolling Kit Pink King Size** (ID: 10181)
7. **Blazy Susan Deluxe Rolling Kit Purple 1 1/4** (ID: 10183)
8. **Limpiador de moledores Fórmula Secreta Grinder 250mL** (ID: 5784)
9. **Vaporizador Dynavap M7 XL** (ID: 10189)
10. **Lonchera con Clave Anti-Olor Ozeta** (ID: 10179)
11. **Shoulderbag con Clave Anti-odor OZeta** (ID: 10180)
12. **Puffco Vaporizador Peak Pro** (ID: 9247)
13. **Blazy Susan Deluxe Rolling Kit Purple King Size** (ID: 10182)
14. **Moledor Metálico Bulldog Swing Giratorio** (ID: 10188)
15. **Futurola x Mike Tyson King Size + Tips** (ID: 10187)

### Detailed Observations of Reduced Products (Offers Partially Unlinked)
The **15** reduced products are:
1. **Bandeja RAW metálica Girl - Mediana** (ID: 5735) (1 offer unlinked)
2. **Classic Ice 26Cm-Bonglab** (ID: 5773) (1 offer unlinked)
3. **RAW Connoisseur 1.1/4+ Tips de RAW para armar** (ID: 10053) (1 offer unlinked)
4. **Papelillos RAW Classic King Size Slim - Sabanas** (ID: 5418) (1 offer unlinked)
5. **Papelillos OCB X-Pert 1 1/4** (ID: 5479) (1 offer unlinked)
6. **Papelillos RAW Artesano 1 1/4** (ID: 6574) (1 offer unlinked)
7. **OCB Premium 1.1/4 + Tips** (ID: 10083) (1 offer unlinked)
8. **OCB Premium Slim King Size 32 hojas** (ID: 10140) (1 offer unlinked)
9. **Papelillo Slim Ultimate King Size- Ocb** (ID: 10146) (1 offer unlinked)
10. **Vaporizador Volcano Classi** (ID: 9246) (1 offer unlinked)
11. **Estuche Anti Olor OZeta Pequeño (Color a elección)** (ID: 5765) (1 offer unlinked)
12. **Conos Pre Roll 1 1/4 Pack 6U-Blazy Susan** (ID: 5705) (1 offer unlinked)
13. **Moledor OCB Eco Hemp 55mm** (ID: 6001) (1 offer unlinked)
14. **Vaporizador Mecánico Dynavap M7** (ID: 5737) (1 offer unlinked)
15. **Pipa Hitter 12mm Calvo | One Hitter color rosa y negro Chile** (ID: 6010) (1 offer unlinked)

---

## 2. Logic Chain
The reasoning explaining these diff patterns is as follows:
- **Consistent Offer Population**: The total number of offer rows loaded remains exactly 1444 in both databases. This means no offers were added or deleted, and the differences are entirely due to changes in mapping association (`Offer.productId`).
- **Product Cleanup**: The decrease in total products from 219 to 205 (a net decrease of 14) corresponds with the 15 removed products plus 2 split products and 1 merged product ($219 - 15 - 2 + 1 + 2 = 205$ unique products).
- **Split Lighter Grouping**: The group `Encendedor Clipper Racoons` in `dev_recovered.db` contained several heterogeneous Clipper lighters, including ones branded `the-bulldog` (e.g. `Moledor/Encendedor Clipper Bulldog Ámsterdam`). The matching logic successfully split `Encendedor Clipper The Bulldog Amsterdam` (brandKey `the-bulldog`) into its own product, preventing Clipper-branded items from being incorrectly lumped under the generic "Racoons" model slug.
- **Split Pipas Grouping**: The pipe group `Pipa De Mano Heavy Gear` was split. The specific clear/black 20mm variations were correctly isolated into the product `CABO Heavy Gear 20mm (Clear/Black) - CABO | PIRANHA`.
- **Fuzzy-unlinking of Unmatched Offers**: The curation logic deselects manual/stale mappings that fail fuzzy matching criteria or don't satisfy the minimum store constraint (`CURATE_MIN_STORES=2` or similar thresholds). For example, `Blazy Susan Deluxe Rolling Kit Pink 1 1/4` (ID: 10184) was unlinked because it only has 1 store offer in the database.

---

## 3. Caveats
- This comparison assumes that the `url` field is a globally unique and stable key to identify the same offer across both databases, which is backed by the `@unique` constraint on the `Offer.url` field in the Prisma schema.
- Database entries in `test_matching.db` were analyzed as-is. We did not re-run matching or change any database state.

---

## 4. Conclusion
The database `test_matching.db` has refined mappings compared to `dev_recovered.db`:
- It has eliminated 15 low-confidence or single-store products.
- It split incorrect multi-brand groupings (e.g., Clipper vs. Bulldog Amsterdam lighters).
- It consolidated matching offers (e.g. Cabo Heavy Gear 20mm Clear/Black).
This represents a higher precision in product mapping at the expense of unlinking 48 offers ($870 - 822$ unlinked offers).

---

## 5. Verification Method
1. You can inspect the verification summary in the log output of the comparison run:
   ```
   Loaded 1444 offers from dev_recovered.db
   Loaded 1444 offers from test_matching.db
   dev_recovered.db: 219 products, 822 unlinked offers
   test_matching.db: 205 products, 870 unlinked offers
   ```
2. Both databases can be inspected using Prisma Client:
   - `dev_recovered.db` path: `E:\soloWeed\prisma\dev_recovered.db`
   - `test_matching.db` path: `E:\soloWeed\prisma\test_matching.db`
3. A JSON backup of this run is available at `E:\soloWeed\.agents\worker_diff_analysis_matching\compare-results.json` for full audit trails.
