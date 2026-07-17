# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

SoloWeed: a price comparator (inspired by SoloTodo) for cannabis paraphernalia in Chile — bongs, pipes, grinders, rolling papers, vaporizers, etc. It does not sell anything; it scrapes five stores (Astro Growshop, Fumetas, Piranha, GrowBarato Chile, Kushbreak) and links to them. Stack: Next.js 16 App Router + TypeScript + Tailwind 4, Prisma + SQLite, Cheerio for scraping.

**The detailed operational docs are in Spanish and are the source of truth.** Read in this order when touching the corresponding area: `AGENTS.md` (summary), `docs/PROJECT_RULES.md` (invariants), `docs/RUNBOOK.md` (exact commands), `docs/SCRAPER_RULES.md`, `docs/MATCHING_AND_SLUGS.md`, `docs/DATA_MODEL.md`.

## Commands

The primary environment is Windows / PowerShell, so env vars are set with `$env:NAME="value"; npm run ...`.

```powershell
npm install                  # runs prisma generate via postinstall
Copy-Item .env.example .env  # DATABASE_URL="file:./dev.db"
npm run db:migrate

npm run dev                  # Next dev (Webpack — see invariants)
npm run build                # required verification for app/scraper/matching changes
npm run lint                 # required verification
npm run test                 # tsx --test over tests/*.test.ts
npx tsx --test tests/matching.test.ts   # run a single test file
```

Data pipeline commands:

```powershell
# Scrape (full runs hit external sites and are slow; validate changes with a limited run)
$env:SCRAPE_LIMIT_PER_STORE="20"; $env:SCRAPE_DELAY_MS="100"; npm run scrape
$env:SCRAPE_STORES="astrogrowshop"; ... npm run scrape          # one store

# Curation (dry-run by default; approved apply form below)
npm run catalog:curate
$env:CURATE_MIN_STORES="2"; npx tsx scripts/curate-comparable-products.ts --apply

# Auto-match offers to products
$env:AUTO_MATCH_MIN_STORES="2"; $env:AUTO_MATCH_CATEGORIES="Bongs,Pipas"; npm run match:auto

# Expand curated product offers (fuzzy threshold)
$env:EXPAND_MIN_SCORE="0.86"; npm run catalog:expand

# Image-fingerprint matching (diagnostic only, never writes to the DB; review
# each pair against title/price/measures, apply via a targeted script)
$env:MATCH_IMG_CATEGORIES="Bongs,Pipas"; npm run match:image

npm run catalog:audit:export   # export catalog audit
npm run brand:backfill         # backfill brandKey
npm run model:backfill         # backfill modelKey/modelSlug
```

## Architecture

### Data model (Prisma, SQLite at `prisma/dev.db`)

`Store -> Offer -> PriceHistory`, with `Offer.productId -> Product` **optional**. An `Offer` is a raw scraped listing from one store; a `Product` is a *curated* identity (same brand/model/variant/size) that groups equivalent offers across stores. `Product` carries `brandKey` + `modelKey` + `modelSlug`, which must always stay in sync — they drive public URLs. `MatchDecision` records accepted/rejected offer-pair matches reviewed in the admin UI. `User`/`Session` back the `/interno` admin (session auth in `src/lib/auth.ts`; create admins with `npm run admin:create`).

### Data pipeline (scripts/, run via tsx)

1. **Scrape** (`scripts/scrape.ts`, one large file): store configs, candidate URL discovery via sitemaps/category pages, product classification, persistence, and price-history creation. After scraping a store it *reclassifies that store's existing offers* from stored title/URL/sourceCategory, so category/brand rule fixes repair old data. `PriceHistory` rows are only added when price, original price, or stock changes.
2. **Match/curate** (`auto-match-offers.ts`, `curate-comparable-products.ts`): create `Product` rows and link equivalent offers. Normalization rules are **category-specific** (Papelillos vs Pipas vs Moledores etc. weigh different signals) — see `docs/MATCHING_AND_SLUGS.md`; do not reuse one category's rules in another.
3. **Expand** (`expand-curated-product-offers.ts`): fuzzy-attach remaining offers to curated products.
4. **Audit** (`export-catalog-audit.ts`).

The many other scripts in `scripts/` are one-off promotion/diagnosis/fix tools from past curation rounds.

### App (src/)

- `src/app/page.tsx` — home catalog. For most curated categories it must only show groups sharing a `productId` (no fuzzy grouping without a `Product`).
- `src/app/productos/[...slug]/page.tsx` — comparison detail; supports `/productos/<slug>` and `/productos/<brandKey>/<modelSlug>`. Contains the fuzzy matcher used at render time; its constants live in `src/lib/matching-constants.ts` / `matching.ts` and must be updated when adding brands or categories.
- `src/app/interno/` — admin (login, match review, reports).
- `src/lib/prisma.ts` — Prisma client singleton; always use it.

## Invariants (non-negotiable per project docs)

- **Webpack, not Turbopack.** `npm run dev`/`npm run build` use `--webpack` because Turbopack fails to externalize Prisma here. `next.config.ts` sets `serverExternalPackages: ["@prisma/client"]` — keep it.
- **Public URL structure is approved and stable**: `/productos/<brandKey>/<modelSlug>`. Don't change or "simplify" it. `modelSlug` must not repeat the brand or the category word, and must be a clean model concept (e.g. good: `/productos/raw/classic-king-size-slim`; bad: `/productos/raw/raw-classic-papelillos-1-1-4`).
- **The live DB is whatever `DATABASE_URL` in `.env` points to** — currently `prisma/dev_recovered.db`, NOT `dev.db`. Never query/assume `dev.db` directly; the snapshot scripts (`snapshot-save.ps1`/`snapshot-restore.ps1`) resolve the file from `.env`. Never edit the SQLite file manually (the many `dev*.db` files in `prisma/` are old checkpoints). Use scripts/migrations/scraping.
- **Products that reached 4 stores are frozen**: their offers and URLs must never change; the goal is only to add new products to that group. Protect them around any curation/linking cycle with `scripts/protect-multistore-links.ts` (`--save` before curating, `--verify`/`--restore` after linking; backup at `reports/protected-links.json`).
- **Brand lists/aliases live only in `src/lib/matching-constants.ts`** (`KNOWN_BRAND_PHRASES`, `BRAND_ALIASES`); `scripts/scrape.ts` and `scripts/backfill-brand-keys.ts` import them. Don't re-duplicate. `brand:backfill` is non-destructive: it never nulls an existing `brandKey` and never changes an existing `Product.brandKey`.
- **Review expand/link dry-runs case by case before applying**: generic `modelKey`s produce false "exact" matches (distinct Ozeta bags → crossbag-5x5, Mighty accessories → Mighty+ vaporizer). When in doubt, apply approved links via a targeted `link-ronda*-reviewed.ts`-style script instead of running the auto-linker's `--apply`.
- **Curation unlinks manual work**: `curate-comparable-products.ts` detaches offers during fuzzy matching. Correct order: 1) curate, 2) manually link offers, 3) audit **without re-curating**.
- **Scraper hygiene**: never persist category/brand/search/pagination URLs as products. Piranha/GrowBarato are PrestaShop — only `.html` product URLs are valid; anything else must be cleaned as stale.
- In this Next 16 codebase, `params` of dynamic routes and `searchParams` are typed as **Promises** — keep that pattern.
- Run `npm run lint` and `npm run build` before finishing any app/scraper/matching/derived-data change. If you touched the scraper, also do a limited scrape run to validate no bad URLs persist.
