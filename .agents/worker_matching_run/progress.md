# Progress - worker_matching_run

Last visited: 2026-06-09T20:30:40Z

- [x] Check initial state of database prisma/test_matching.db (counts of Product / Offer).
  - Mapped Offers: 622
  - Unmapped Offers: 822
  - Total Products: 219
  - Total Offers: 1444
- [x] Run curation script on test_matching.db and check counts.
  - Command: `$env:DATABASE_URL="file:./test_matching.db"; $env:CURATE_MIN_STORES="2"; npx tsx scripts/curate-comparable-products.ts --apply`
  - Total Products: 205 (219 -> 205)
  - Mapped Offers: 573 (622 -> 573)
  - Unmapped Offers: 871 (822 -> 871)
- [x] Run expansion script on test_matching.db and check counts.
  - Command: `$env:DATABASE_URL="file:./test_matching.db"; $env:EXPAND_MIN_SCORE="0.86"; npx tsx scripts/expand-curated-product-offers.ts --apply`
  - Matched and updated 1 offer (`#396 -> product #10141`)
  - Total Products: 205 (205 -> 205)
  - Mapped Offers: 574 (573 -> 574)
  - Unmapped Offers: 870 (871 -> 870)
- [x] Run auto-match script on test_matching.db and check counts.
  - Command: `$env:DATABASE_URL="file:./test_matching.db"; $env:AUTO_MATCH_MIN_STORES="2"; $env:AUTO_MATCH_CATEGORIES="Bongs,Pipas"; npx tsx scripts/auto-match-offers.ts --apply`
  - High-confidence groups matched: 0, updated offers: 0
  - Total Products: 205 (205 -> 205)
  - Mapped Offers: 574 (574 -> 574)
  - Unmapped Offers: 870 (870 -> 870)
- [x] Document final results and write handoff.md.
- [x] Send status message to caller.
