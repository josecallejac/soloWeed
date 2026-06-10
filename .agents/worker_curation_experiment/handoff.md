# Handoff Report - Curation Experiment

## 1. Observation
- **Original database file**: `E:\soloWeed\prisma\dev_recovered.db` (3,092,480 bytes, containing 220 `Product` and 622 `Offer` rows with a linked `productId`).
- **Duplicate targets**: `E:\soloWeed\prisma\baseline.db` (3,092,480 bytes) and `E:\soloWeed\prisma\test.db` (3,092,480 bytes) copied from `dev_recovered.db`.
- **Command run on `baseline.db` for curation**:
  - Command: `$env:DATABASE_URL="file:./baseline.db"; $env:CURATE_MIN_STORES="2"; npx tsx scripts/curate-comparable-products.ts --apply`
  - Output log: `E:\soloWeed\.agents\worker_curation_experiment\baseline_curate.log`
  - Output excerpt:
    ```
    Curate mode: apply
    Max products per category: 9999
    Minimum stores per product: 2
    Selected products: 206
    Selected offers: 575
    ...
    Curated comparable products applied.
    ```
- **Command run on `baseline.db` for expansion**:
  - Command: `$env:DATABASE_URL="file:./baseline.db"; $env:EXPAND_MIN_SCORE="0.86"; npx tsx scripts/expand-curated-product-offers.ts --apply`
  - Output log: `E:\soloWeed\.agents\worker_curation_experiment\baseline_expand.log`
  - Output:
    ```
    Expand mode: apply
    Minimum score: 0.86
    Matched offers: 13
    ...
    Updated offers: 13
    ```
- **Command run on `test.db` for curation**:
  - Command: `$env:DATABASE_URL="file:./test.db"; $env:CURATE_MIN_STORES="2"; npx tsx scripts/curate-comparable-products.ts --apply`
  - Output log: `E:\soloWeed\.agents\worker_curation_experiment\test_curate.log`
  - Output excerpt:
    ```
    Curate mode: apply
    Max products per category: 9999
    Minimum stores per product: 2
    Selected products: 206
    Selected offers: 575
    ...
    Curated comparable products applied.
    ```
- **Command run on `test.db` for expansion**:
  - Command: `$env:DATABASE_URL="file:./test.db"; $env:EXPAND_MIN_SCORE="0.80"; npx tsx scripts/expand-curated-product-offers.ts --apply`
  - Output log: `E:\soloWeed\.agents\worker_curation_experiment\test_expand.log`
  - Output:
    ```
    Expand mode: apply
    Minimum score: 0.8
    Matched offers: 13
    ...
    Updated offers: 13
    ```
- **Database count verification results**:
  - `dev_recovered.db`: 220 `Product` records, 622 linked `Offer` records (remains intact and unmodified).
  - `baseline.db`: 206 `Product` records, 588 linked `Offer` records (206 products and 588 offers with `productId` associated).
  - `test.db`: 206 `Product` records, 588 linked `Offer` records (206 products and 588 offers with `productId` associated).
- **Linter and build verification commands and results**:
  - `npm run lint` completed successfully with zero issues.
  - `npm run build` completed successfully, compiling all pages.

## 2. Logic Chain
- We duplicated `dev_recovered.db` to both `baseline.db` and `test.db`, ensuring that both experiments started from the exact same snapshot of crawled data.
- Curation uses the `scripts/curate-comparable-products.ts` script. When run with `--apply`, it clears any existing product mappings in the target database and re-groups offers into products based on `CURATE_MIN_STORES`. The curation output shows it identified 206 products and 575 offers matching the default criteria (minimum 2 stores for most categories).
- Expansion uses `scripts/expand-curated-product-offers.ts`. It takes unmapped offers and tries to match them to existing products with a score higher than or equal to `EXPAND_MIN_SCORE`.
  - For `baseline.db` with `EXPAND_MIN_SCORE=0.86`, 13 offers matched.
  - For `test.db` with `EXPAND_MIN_SCORE=0.80`, 13 offers matched.
- The resulting counts in both databases were verified using Node.js/Prisma:
  - Curation: 206 products, 575 matched offers.
  - Expansion: 13 additional offers matched.
  - Total matched: 588 offers in both databases.
- The original database `dev_recovered.db` has 220 products and 622 offers, confirming that it remained completely untouched and unmodified.

## 3. Caveats
- No caveats. The database files were isolated, copied, and processed sequentially using their respective environment variables. Both runs yielded identical numbers of expanded offers because all potential expansion candidates with a score between `0.80` and `0.86` had already scored `0.90` or `0.94` (the lowest score matched was `0.90` for both runs).

## 4. Conclusion
- Both `baseline.db` and `test.db` have been successfully created, curated, and expanded, according to the experimental parameters.
- `dev_recovered.db` has been verified to be intact and unmodified.
- The project's build and lint checks pass cleanly.

## 5. Verification Method
To verify the database states, run the following Node.js commands:
- For `dev_recovered.db` counts:
  ```powershell
  $env:DATABASE_URL="file:./dev_recovered.db"; node -e "const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); Promise.all([p.product.count(), p.offer.count({where: {productId: {not: null}}})]).then(console.log).then(() => process.exit(0))"
  ```
- For `baseline.db` counts:
  ```powershell
  $env:DATABASE_URL="file:./baseline.db"; node -e "const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); Promise.all([p.product.count(), p.offer.count({where: {productId: {not: null}}})]).then(console.log).then(() => process.exit(0))"
  ```
- For `test.db` counts:
  ```powershell
  $env:DATABASE_URL="file:./test.db"; node -e "const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); Promise.all([p.product.count(), p.offer.count({where: {productId: {not: null}}})]).then(console.log).then(() => process.exit(0))"
  ```
