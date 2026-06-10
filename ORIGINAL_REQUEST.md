# Original User Request

## Initial Request — 2026-06-09T14:02:31-04:00

# Teamwork Project Prompt — Draft

> Status: Ready for launch — awaiting user approval
> Goal: Craft prompt → get user approval → delegate to teamwork_preview

Safely test lowering `EXPAND_MIN_SCORE` to `0.80` in the curation scripts. The team must analyze the newly generated matches to ensure no false positives are introduced, verifying quality before committing any permanent changes.

Working directory: E:/soloWeed
Integrity mode: development

## Requirements

### R1. Ejecutar de forma aislada
Duplicate the main database to a temporary file (e.g., `test.db`). The team must run the curation scripts with `EXPAND_MIN_SCORE=0.80` against this temporary database so the production data is never at risk.

### R2. Análisis de diferencias
The team must programmatically analyze the differences between the original DB and `test.db` to identify newly grouped products and specifically hunt for false positives.

### R3. Reporte de hallazgos
Generate a markdown artifact containing the newly grouped products, highlighting any false positives (groupings that shouldn't have happened) and providing a recommendation on whether 0.80 is a safe threshold.

## Acceptance Criteria

### Verificación Objetiva
- [ ] A `test.db` file exists and contains the updated products.
- [ ] The main `prisma/dev_recovered.db` file's timestamp/state remains unmodified by the curation script.
- [ ] A markdown report is generated detailing the exact offers that were merged under the `0.80` score threshold.

## Follow-up — 2026-06-09T15:33:37-04:00

# Teamwork Project Prompt — Draft

> Status: Ready for launch — awaiting user approval
> Goal: Craft prompt → get user approval → delegate to teamwork_preview

Programmatically identify, standardize, and clean up misspelled or inconsistent brand names across the database (e.g. merging "Storz & bickel" with "Storz&Bickel").

Working directory: E:/soloWeed
Integrity mode: development

## Requirements

### R1. Script en modo Simulacro (Dry-run)
The team must create a TypeScript script (e.g. `scripts/clean-brands.ts`) that programmatically identifies inconsistent or duplicated brand names in the database. The script must NOT modify the database.

### R2. Reporte de Mapeo
The script must generate a structured report file (e.g. JSON or Markdown) listing all the suggested corrections in a mapping format (e.g., `Storz & bickel -> Storz & Bickel`).

## Acceptance Criteria

### Verificación Objetiva
- [ ] A TypeScript script `scripts/clean-brands.ts` exists and runs without syntax or type errors.
- [ ] Running the script generates a physical report file (e.g., `reports/brand_cleanup_map.md` or `.json`).
- [ ] The generated report clearly lists the original misspelled/duplicated brand names alongside their proposed standardized versions.
- [ ] The main `prisma/dev_recovered.db` file's timestamp and state remain entirely unmodified after executing the script.

## Follow-up — 2026-06-09T20:24:23Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview

Ejecutar el proceso completo de curación y matching automático de ofertas sobre la base de datos ya limpia, generando nuevos productos y asociaciones.

Working directory: E:/soloWeed
Integrity mode: development

## Requirements

### R1. Base de Datos Aislada
The team must duplicate the main database into a temporary file (e.g., `test_matching.db`). All matching and curation scripts (`catalog:curate`, `catalog:expand`, etc.) MUST be executed targeting this isolated database using environment variables. The main database must NOT be modified.

### R2. Ejecución Completa de Matching
The team must run the complete suite of matching scripts to identify new groupings and curate new products based on the newly cleaned brand data.

### R3. Análisis y Reporte de Diferencias
The team must programmatically compare the isolated `test_matching.db` against the main database and generate a structured report detailing the net new products created and the net new offers linked.

## Acceptance Criteria

### Verificación Objetiva Programática
- [ ] A copy of the database named `test_matching.db` exists.
- [ ] The main `prisma/dev_recovered.db` file's modified timestamp and checksum remain entirely unchanged from before the team's execution.
- [ ] A physical report file (e.g., `reports/matching_diff.md`) is generated.
- [ ] The report explicitly lists the total number of NEW products curated and NEW offers linked, along with samples of what was grouped.

