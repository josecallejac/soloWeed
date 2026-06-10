# Project: Brand Name Cleanup (Dry Run)

## Architecture
- Database schema: SQLite database managed via Prisma. Offers/Products/Prices containing brand/brandKey.
- Clean-up script: A script `scripts/clean-brands.ts` loaded with prisma/client to read brands, normalize them, group misspelled/inconsistent brands, and output a mapping report.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Explore | Query schema and database to find how brand fields are stored and identify inconsistent/duplicated brands | None | DONE (dbed3a98-f67b-4788-8d74-26704c7d0acf) |
| 2 | Implement | Implement scripts/clean-brands.ts dry-run standardizer | M1 | DONE (003e5a98-2fd8-4085-9c97-f98cbd8f6507) |
| 3 | Verification | Run build, run script, check stdout/stderr, verify generated mapping report | M2 | DONE (c40affd8-16ab-4917-a1cc-75e8e3192b02, c2a171f8-247c-484a-bfd2-b75ecac48e6c) |
| 4 | Audit | Run Forensic Auditor to ensure sqlite db has not been modified | M3 | DONE (8841c81c-2e4a-44f4-8408-39df5a4c9764) |

## Interface Contracts
- None (script is self-contained)
