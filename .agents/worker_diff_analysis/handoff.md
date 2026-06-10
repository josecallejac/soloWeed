# Handoff Report

## 1. Observation
- Database paths analyzed:
  - `prisma/dev_recovered.db` (original production DB)
  - `prisma/baseline.db` (experimental DB curated with `EXPAND_MIN_SCORE=0.86`)
  - `prisma/test.db` (experimental DB curated with `EXPAND_MIN_SCORE=0.80`)
- Database query outputs:
  - `dev_recovered.db` returned: 220 products, 822 unlinked offers, 1,444 total offers.
  - `baseline.db` returned: 206 products, 856 unlinked offers, 1,444 total offers.
  - `test.db` returned: 206 products, 856 unlinked offers, 1,444 total offers.
- Comparison results:
  - `baseline.db` vs `test.db` showed **0 differences** (verified programmatically by matching all 1,444 offers and their product linkages).
  - `test.db` vs `dev_recovered.db` showed:
    - **24 newly grouped / merged products & offers** (where offers are grouped in `test.db` but were unlinked or grouped differently in `dev_recovered.db`).
    - **37 lost / split groupings** (where offers were grouped in `dev_recovered.db` but are unlinked or split in `test.db`).
- Codebase consistency:
  - `npm test` successfully completed: `115 pass, 0 fail`.
  - `npm run lint` successfully completed with `0` violations.
- Verified files:
  - Curation rules: `E:\soloWeed\AGENTS.md` (lines 34-49, category-specific rules).
  - Match scores logic: `src/lib/matching.ts` (using `scoreSuggestion`).

## 2. Logic Chain
- **Step 1**: Extracted database states to JSON files (`dev_recovered.json`, `baseline.json`, `test.json`) using a temporary script (`scripts/compare-curation.ts`) connecting via dynamic `DATABASE_URL` configurations.
- **Step 2**: Verified `baseline.db` vs `test.db` by comparing product slug mappings per offer URL. Since no differences were found, we concluded that `EXPAND_MIN_SCORE` of `0.80` vs `0.86` generated the exact same database state in this run.
- **Step 3**: Compared `test.db` vs `dev_recovered.db` by tracking the transition of each offer's product ID association. Instances of merges (transition from null or separate products to a shared product) and splits (transition from a shared product to null or separate products) were logged.
- **Step 4**: Ran the codebase's `scoreSuggestion` logic pairwise on the grouped offers to get matching scores and reasons.
- **Step 5**: Implemented heuristics to validate the newly grouped items against the category-specific constraints in `AGENTS.md`. The heuristics verified:
  - Grinder parts count (2-part vs 3-part).
  - Accessory pack/unit quantities (1u vs 3u).
  - Rolling kits vs standard booklets (Deluxe Kit containing tips/tray vs papers-only).
  - Rolls vs booklets in Papelillos (Rolls vs King Size Slim flat booklet).
  - Joint angle / size mismatch in Repuestos / Accesorios (45° vs 90°).
  - Gold / Onyx / Classic variant mix in Vaporizadores (Volcano Classic).
- **Step 6**: Captured numerous false positives matching these rules.

## 3. Caveats
- Pairwise similarity scores were computed using `scoreSuggestion` which reflects the current match rules in the codebase (rather than any historic rules).
- The database schema was assumed to be uniform across the three databases, which was validated.

## 4. Conclusion
- `baseline.db` and `test.db` are **completely identical**.
- In comparing `test.db` vs `dev_recovered.db`, there are 24 newly grouped products and 37 lost/split groupings.
- Programmatic audit against `AGENTS.md` rules flagged **10 false positives** in the newly grouped products of `test.db`:
  - **Repuestos Multi-packs**: Mismatched Saber Tip 1u vs 3u under product `focus-v/tip-saber-tip-1u`.
  - **Vaporizador Variants**: Mismatched Volcano Classic Onyx, Volcano Classic Gold 24K, and Volcano Classic Standard under `storz-bickel/volcano-classic`.
  - **Paper Formats/Kits**: Mismatched rolling kits containing trays/tips (Deluxe Rolling Kit) with standard booklet papers under Blazy Susan products.
  - **Rolls vs Booklets**: Mismatched OCB Ultimate Rolls (custom length rolls) with booklets under `ocb/ultimate-king-size-slim`.
  - **Grinder Parts**: Mismatched 2-part and 3-part grinders under product `the-bulldog/plastic-3-partes-63mm`.
  - **Joint Angles**: Mismatched 45° vs 90° flat bucket bangers under `calvo/banger-flat-bucket-macho-90-14mm` and `calvo/banger-simple-macho-90-14mm`.

## 5. Verification Method
- Detailed difference analysis and false-positive audit findings are saved in `E:\soloWeed\.agents\worker_diff_analysis\diff_report.md`.
- Codebase integrity verified by running `npm test` and `npm run lint`. All tests pass, and linter is clean.
