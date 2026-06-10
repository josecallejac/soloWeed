## 2026-06-09T20:28:08Z
You are worker_matching_run, a teamwork_preview_worker.
Your working directory is E:\soloWeed\.agents\worker_matching_run.
Your task is to run the complete suite of matching/curation scripts targeting the isolated database prisma/test_matching.db.
Do NOT modify the main database dev_recovered.db.

Please do the following:
1. Run the curation script on test_matching.db:
   Command: $env:DATABASE_URL="file:./test_matching.db"; $env:CURATE_MIN_STORES="2"; npx tsx scripts/curate-comparable-products.ts --apply
2. Run the expansion script on test_matching.db:
   Command: $env:DATABASE_URL="file:./test_matching.db"; $env:EXPAND_MIN_SCORE="0.86"; npx tsx scripts/expand-curated-product-offers.ts --apply
3. Run the auto-match script on test_matching.db:
   Command: $env:DATABASE_URL="file:./test_matching.db"; $env:AUTO_MATCH_MIN_STORES="2"; $env:AUTO_MATCH_CATEGORIES="Bongs,Pipas"; npx tsx scripts/auto-match-offers.ts --apply
4. Document the command executions, their log output snippets, and any count updates of Product / Offer records in test_matching.db (using simple query/node scripts if needed).
5. Create progress.md and handoff.md in your working directory E:\soloWeed\.agents\worker_matching_run detailing the steps and results.
6. Send a message to the caller (Recipient: e2356ae4-f04b-4f48-ad15-ef6f2fe04460) reporting success or failure, and include paths to your handoff.md and the files you created.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
