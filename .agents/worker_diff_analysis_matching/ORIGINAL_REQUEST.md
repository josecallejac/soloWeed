## 2026-06-09T20:31:05Z
You are worker_diff_analysis_matching, a teamwork_preview_worker.
Your working directory is E:\soloWeed\.agents\worker_diff_analysis_matching.
Your task is to programmatically compare the matching results in E:\soloWeed\prisma\test_matching.db against the main database E:\soloWeed\prisma\dev_recovered.db.
Do NOT modify dev_recovered.db.

Please do the following:
1. Write a temporary TypeScript utility script (e.g. scripts/compare-matching-dbs.ts) or run Node/Prisma code to extract the mappings:
   - For each database, get all Offer rows (id, url, title, brandKey, modelKey, category, productId) and their associated Product name/brandKey/modelSlug (if mapped).
   - Since Product IDs are generated dynamically and will differ between the databases, map and compare groupings based on:
     - The set of Offer URLs/IDs grouped under each Product.
     - BrandKey and ModelSlug of the Product.
2. Specifically analyze:
   - Net new products curated (groups of offers that are linked to a product in test_matching.db, but were either unlinked or in different groups in dev_recovered.db).
   - Net new offers linked (offers that have a productId in test_matching.db, but had null productId in dev_recovered.db).
   - Any split/removed products (groups that existed in dev_recovered.db but were split or unlinked in test_matching.db).
3. Extract samples of:
   - Newly grouped products (showing the product name, and the titles/URLs of the offers grouped under them).
   - Newly linked offers.
4. Clean up any temporary script files you create before finishing.
5. Create progress.md and handoff.md in your working directory E:\soloWeed\.agents\worker_diff_analysis_matching detailing the steps and results.
6. Send a message to the caller (Recipient: e2356ae4-f04b-4f48-ad15-ef6f2fe04460) reporting success or failure, and include paths to your handoff.md and the files you created.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
