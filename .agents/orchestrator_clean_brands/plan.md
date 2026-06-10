# Plan - Brand Name Cleanup (Dry Run)

This plan outlines the steps to programmatically identify, standardize, and clean up misspelled or inconsistent brand names across the database without modifying the SQLite database.

## Tasks and Milestones

### Milestone 1: Exploration & Database Analysis [DONE]
- [x] Query schema and database structures.
- [x] Run initial queries to extract brand names and brand keys from `Product` and `Offer` tables.
- [x] Identify spelling, casing, whitespace variations, and false positive mappings.
- [x] Create canonical mapping recommendations (completed by Explorer subagent).

### Milestone 2: Script Implementation (`scripts/clean-brands.ts`) [PENDING]
- [ ] Dispatch a Worker to implement the dry-run script `scripts/clean-brands.ts`.
- [ ] Define programmatical normalization rules in the script:
  - Casing normalization (e.g., `BONGLAB` -> `Bonglab`).
  - Spacing and punctuation standardizations (e.g., `Storz & bickel` -> `Storz & Bickel`).
  - Typos mapping (e.g., `Clipepr` -> `Clipper`).
  - Correction of description-overlap false positives (e.g., `Squadafum` mapped to `clipper`).
- [ ] Ensure the script outputs a structured markdown and JSON report detailing the changes.
- [ ] Ensure the script runs strictly in **dry-run** mode (no `prisma.update`, `prisma.updateMany`, `$executeRaw`, etc., that modify the database).

### Milestone 3: Verification & Validation [PENDING]
- [ ] Dispatch a Reviewer to verify type safety, correctness, and review the code.
- [ ] Dispatch a Challenger to execute the script and verify that:
  - The script executes successfully via `npx tsx scripts/clean-brands.ts`.
  - It generates the physical report file (e.g., `reports/brand_cleanup_map.md` or `.json`).
  - The report clearly lists original values vs proposed canonical ones.
  - The database file (e.g., `prisma/dev_recovered.db` or whatever is active) is not modified.
- [ ] Verify database modification by checking timestamps and MD5/SHA256 hashes of the SQLite file before and after the script execution.

### Milestone 4: Forensic Audit & Wrap-up [PENDING]
- [ ] Dispatch a Forensic Auditor to perform integrity audits.
- [ ] Write the orchestrator handoff.md.
- [ ] Report completion to the Sentinel.
