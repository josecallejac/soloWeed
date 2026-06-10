## 2026-06-09T19:40:05Z
You are the TypeScript Script Implementer. Your working directory is E:\soloWeed\.agents\worker_implement_1 (please create this folder if it doesn't exist).

Task:
Implement a TypeScript script `scripts/clean-brands.ts` that programmatically identifies inconsistent, misspelled, casing-variant, or duplicated brand names (and brandKeys) in the database and generates a mapping report, WITHOUT modifying the database.

Requirements:
1. The script must be written in TypeScript at `scripts/clean-brands.ts`.
2. It should import the `prisma` client from `src/lib/prisma` (e.g., `import { prisma } from "../src/lib/prisma";`).
3. It must query the database to retrieve all `Product` and `Offer` records with brand metadata.
4. It must identify inconsistent brand names and brand keys by standardizing them programmatically (casing, whitespace, typos, false positives). Use the explorer's recommended mappings as a starting reference:
   - Casing/spacing: `BONGLAB`/`BongLab`/`Bonglab`/`bonglab` -> `Bonglab` (brand) / `bonglab` (brandKey), `BLAZY SUSAN` -> `Blazy Susan` (brand) / `blazy-susan` (brandKey), `Calvo`/`Calvo Glass` -> `Calvo Glass` (brand) / `calvo` (brandKey), `Storz & Bickel` (casing/ampersand clean up), `RAW` (casing), etc.
   - Typos: `Clipepr` -> `Clipper`, `G-ROLZZ` -> `G-Rollz`.
   - Null brands where brandKey exists (e.g., brandKey `davinci` -> brand `DaVinci`).
   - Specific false-positive corrections (Offer 4663, 8164, 2082, 2724, 1219, 1528, Product 5729, 9547, 9481).
5. The script must NOT execute any database updates, raw database modifications, or writes (such as `prisma.product.update`, `$executeRaw`, etc.). It must be strictly read-only.
6. The script must generate a detailed report file at `reports/brand_cleanup_map.md` (and a JSON format at `reports/brand_cleanup_map.json` for structured access). The reports should detail:
   - Summary statistics (total products affected, total offers affected, count of issues by category).
   - Inconsistencies found (original vs. proposed canonical brand and brandKey).
   - A list of affected items (Product / Offer IDs, titles/names, original values, proposed values).
7. Test the script by compiling and running it (e.g., via `npx tsx scripts/clean-brands.ts`). Ensure it completes successfully with exit code 0 and leaves the database completely unmodified.
8. Document your changes and compile/run verification in E:\soloWeed\.agents\worker_implement_1\handoff.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
