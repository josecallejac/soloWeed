# Project: Complete Curation and Matching Run

## Architecture
- **Source Database**: `prisma/dev_recovered.db` (must remain unmodified).
- **Matching Target Database**: `prisma/test_matching.db` (temporary duplicate).
- **Objective**: Run the full curation and matching suite (`catalog:curate`, `catalog:expand`, `match:auto`) on `prisma/test_matching.db` and programmatically compare it to `prisma/dev_recovered.db` to generate a diff report of new products and linked offers.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | DB Setup | Copy `prisma/dev_recovered.db` to `prisma/test_matching.db` and record initial metadata (checksum/timestamp) | None | PLANNED |
| 2 | Matching Run | Run curation, expansion, and auto-matching scripts on `test_matching.db` | M1 | PLANNED |
| 3 | Diff Generation | Programmatically analyze the differences between `test_matching.db` and `dev_recovered.db` to count net new products and linked offers | M2 | PLANNED |
| 4 | Report Compilation | Write `reports/matching_diff.md` showing metrics, new products, and samples of grouped offers | M3 | PLANNED |
| 5 | Integrity Verification | Run linter/build, and verify that `dev_recovered.db` remains untouched | M4 | PLANNED |

## Interface Contracts
- None (matching pipeline run and analysis, no changes to code or schema)
