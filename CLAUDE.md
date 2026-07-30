# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

SoloWeed: a price comparator (inspired by SoloTodo) for cannabis paraphernalia in Chile — bongs, pipes, grinders, rolling papers, vaporizers, etc. It does not sell anything; it scrapes six stores and links to them. Stack: Next.js 16 App Router + TypeScript + Tailwind 4, Prisma + **PostgreSQL**, Cheerio for scraping.

Store IDs are not contiguous — hardcode them from this table, never assume:

| store | id | platform |
|---|---|---|
| Astro Growshop | 1 | Jumpseller |
| Fumetas | 2 | Jumpseller |
| Piranha | 3 | PrestaShop |
| GrowBarato Chile | 4 | PrestaShop |
| Kushbreak | 8 | Jumpseller |
| Friendly Grow | 24 | Jumpseller |

**The detailed operational docs are in Spanish and are the source of truth.** Read in this order when touching the corresponding area: `AGENTS.md` (summary), `docs/PROJECT_RULES.md` (invariants), `docs/RUNBOOK.md` (exact commands), `docs/SCRAPER_RULES.md`, `docs/MATCHING_AND_SLUGS.md`, `docs/DATA_MODEL.md`, `docs/HANDOFF.md`.

**Adding a store? `docs/NUEVA_TIENDA.md` is the standard procedure** — the 5 sweeps to run so its offers get linked to the catalog, in order of measured yield, plus what each one is blind to. Consolidated after applying it end to end to Friendly Grow and Kushbreak.

## Commands

The primary environment is Windows / PowerShell, so env vars are set with `$env:NAME="value"; npm run ...`.

```powershell
npm install                  # runs prisma generate via postinstall
npm run db:migrate

npm run dev                  # Next dev (Webpack — see invariants)
npm run build                # required verification for app/scraper/matching changes
npm run lint                 # required verification
npm run test                 # scripts/run-tests.mjs enumerates tests/*.test.ts (Node can't glob .ts)
npx tsx --test tests/matching.test.ts   # run a single test file
npm run test:e2e             # Playwright, needs a built server
```

> **Do not `Copy-Item .env.example .env`.** `.env.example` is stale: it still says
> `DATABASE_URL="file:./dev.db"`, which would silently point you at a dead SQLite file
> instead of the live Postgres. Get the real URL from the Railway service.

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

# Image/embedding matching (diagnostic only, never writes to the DB; review
# each pair against title/price/measures, apply via a targeted script)
$env:MATCH_IMG_CATEGORIES="Bongs,Pipas"; npm run match:image
npm run match:embedding        # CLIP; run AFTER match:image, it reuses its image cache

# Triage the (multi-MB) match logs into a compact CSV instead of reading them
$env:TRIAGE_FROZEN="7"; npx tsx scripts/triage-matches.ts <log>   # = store count + 1

# Targeted growth search: product of N stores -> orphans of the stores it lacks
$env:UPGRADE_STORES="friendlygrow"; $env:UPGRADE_LEVELS="2,3,4,5"; npx tsx scripts/find-store-upgrades.ts
$env:IMGUP_STORE="friendlygrow"; $env:IMGUP_LEVELS="4"; npx tsx scripts/find-store-upgrades-by-image.ts

# Orphan <-> orphan by image: finds products that don't exist as a `Product` row
# yet. ALWAYS measure the signal first — it reports recall on human-verified
# pairs, which is what makes an empty sweep mean anything (FG: only 14%).
$env:SIGNAL_STORE="friendlygrow"; npx tsx scripts/measure-image-signal-power.ts
$env:ORPHIMG_STORE="friendlygrow"; npx tsx scripts/find-orphan-pairs-by-image.ts

npm run catalog:audit:export   # export catalog audit
npm run brand:backfill         # backfill brandKey
npm run model:backfill         # backfill modelKey/modelSlug
npm run prices:refresh         # refresh product price aggregates
npm run catalog:short-desc -- --apply   # needs `ollama serve` running (see below)
```

### After every curation round, in this order

```powershell
npx tsx scripts/protect-multistore-links.ts --verify   # must be clean BEFORE and AFTER
npm run brand:backfill
npm run catalog:short-desc -- --apply                  # new products are born with null
npx tsx scripts/protect-multistore-links.ts --save     # only once the diff is intentional
npm run lint; npm run test; npm run build
```

`ollama serve` **does not autostart on this machine** — launch it before
`catalog:short-desc` or the script aborts on its preflight. Model: `llama3`.

## Architecture

### Data model (Prisma, PostgreSQL on Railway — see invariants)

`Store -> Offer -> PriceHistory`, with `Offer.productId -> Product` **optional**. An `Offer` is a raw scraped listing from one store; a `Product` is a *curated* identity (same brand/model/variant/size) that groups equivalent offers across stores. `Product` carries `brandKey` + `modelKey` + `modelSlug`, which must always stay in sync — they drive public URLs. `MatchDecision` records accepted/rejected offer-pair matches reviewed in the admin UI. `User`/`Session` back the `/interno` admin (session auth in `src/lib/auth.ts`; create admins with `npm run admin:create`).

### Data pipeline (scripts/, run via tsx)

1. **Scrape** (`scripts/scrape.ts`, one large file): store configs, candidate URL discovery via sitemaps/category pages, product classification, persistence, and price-history creation. After scraping a store it *reclassifies that store's existing offers* from stored title/URL/sourceCategory, so category/brand rule fixes repair old data. `PriceHistory` rows are only added when price, original price, or stock changes.
2. **Match/curate** (`auto-match-offers.ts`, `curate-comparable-products.ts`): create `Product` rows and link equivalent offers. Normalization rules are **category-specific** (Papelillos vs Pipas vs Moledores etc. weigh different signals) — see `docs/MATCHING_AND_SLUGS.md`; do not reuse one category's rules in another.
3. **Expand** (`expand-curated-product-offers.ts`): fuzzy-attach remaining offers to curated products.
4. **Audit** (`export-catalog-audit.ts`).

The many other scripts in `scripts/` are one-off promotion/diagnosis/fix tools from past curation rounds.

### Scope: `classifyProduct` is the only source of truth

`classifyProduct(title, url, sourceCategory)` in `scripts/scrape.ts` returns a category
string for in-scope items and **`null` for out-of-scope** (cultivo, semillas, flavoured
disposable vapes, e-liquid pod kits). Out-of-scope offers are **never deleted** — they stay
as orphans and diagnostics are expected to filter them out.

Two traps that follow from this:

- **`Offer.category` goes stale and nothing repairs it.** `reclassifyExistingOffers` skips
  rows where the classifier returns `null` (`if (!category || ...) continue`), so an offer
  that *falls out* of scope keeps its old in-scope category forever — not even a full
  re-scrape fixes it. Never trust the stored `category` to decide scope.
- **Filter with the classifier, never with a parallel list.** `diagnose-orphan-pairs.ts`,
  `find-store-upgrades.ts` and `find-store-upgrades-by-image.ts` do
  `classifyProduct(...) !== null`. `diagnose-brand-coverage-gap.ts`, `triage-matches.ts` and
  `match-by-image.ts` still don't — add the same guard if you touch them. A hand-maintained
  list of out-of-scope offers desynchronises and is worthless the day the rule changes.

### Repo conventions

- `scripts/link-r<N>*-reviewed.ts` — one script per applied curation round. **Dry-run by
  default, writes only with `--apply`**, with guards that abort if an offer already hangs
  off another product or a product doesn't have the expected store count. The header comment
  records the evidence for every accepted pair *and* every rejected one; that comment is the
  audit trail, so write it before applying.
- `plans/` — briefs handed to the second AI. Versioned since r58 (earlier briefs were lost
  because the directory was untracked).
- `/scratch/` — gitignored; put throwaway diagnostic scripts here, not in `scripts/`.

### App (src/)

- `src/app/page.tsx` — home catalog. For most curated categories it must only show groups sharing a `productId` (no fuzzy grouping without a `Product`).
- `src/app/productos/[...slug]/page.tsx` — comparison detail; supports `/productos/<slug>` and `/productos/<brandKey>/<modelSlug>`. Contains the fuzzy matcher used at render time; its constants live in `src/lib/matching-constants.ts` / `matching.ts` and must be updated when adding brands or categories.
- `src/app/interno/` — admin (login, match review, reports).
- `src/lib/prisma.ts` — Prisma client singleton; always use it.

## Invariants (non-negotiable per project docs)

- **Webpack, not Turbopack.** `npm run dev`/`npm run build` use `--webpack` because Turbopack fails to externalize Prisma here. `next.config.ts` sets `serverExternalPackages: ["@prisma/client"]` — keep it.
- **Public URL structure is approved and stable**: `/productos/<brandKey>/<modelSlug>`. Don't change or "simplify" it. `modelSlug` must not repeat the brand or the category word, and must be a clean model concept (e.g. good: `/productos/raw/classic-king-size-slim`; bad: `/productos/raw/raw-classic-papelillos-1-1-4`).
- **The live DB is whatever `DATABASE_URL` in `.env` points to** — since the 12 Jul 2026 migration that is the **PostgreSQL on Railway (production)**, reached over its public URL, and `schema.prisma` declares `provider = "postgresql"`. Scraping and curation run from the local machine straight against production, so **every script you run touches live data**. The SQLite files in `prisma/` (`dev.db`, `dev_recovered.db`, the `dev*.db` checkpoints) are read-only historical backups — never query them and never assume the DB is SQLite. Snapshots are logical JSON dumps via `pg-snapshot.ts` (`snapshot-save.ps1`/`snapshot-restore.ps1`). Use scripts/migrations/scraping.
- **Products that reached 4 stores are frozen**: their offers and URLs must never change. The one exception is **"solo sumar"** — a frozen product may *receive* the offer of a store it lacks and move up a level; it may never lose or swap an existing one. Anything that would drop a frozen product a level needs explicit user approval, case by case. Protect them around any curation/linking cycle with `scripts/protect-multistore-links.ts` (`--save` before curating, `--verify`/`--restore` after linking; backup at `reports/protected-links.json`).
- **Every proposed link must answer "does this add a store?"** before it is applied. Measure it on the whole batch against the *previous* state, never offer by offer: when several offers of the same store come from one batch, each one sees its siblings already linked and reports a false "that store was already there". The same aggregate-vs-individual trap bit `find-curated-destinations`, `diagnose-identity-evidence` (comparing an offer against itself) and phase 3 of r54.
- **The URL settles identity before the photo does.** If the orphan's store already sells the destination product under a *different* base URL, they are two models — no image needed. `scripts/diagnose-identity-evidence.ts` (`$env:EV_PAIRS="offerId:productId,..."`) emits this mechanically as `MISMA-FICHA` / `SKU-COMPARTIDO` / `OTRA-FICHA-MISMA-TIENDA` / `TIENDA-AUSENTE`. A shared SKU/EAN **across stores** is hard identity; a shared SKU *within* one store means the two offers belong in the same product, which is the opposite of a mislink. Size and edition never merge (55mm ≠ 63mm, Wu-Tang ≠ Tyga); colour does.
- **Brand lists/aliases live only in `src/lib/matching-constants.ts`** (`KNOWN_BRAND_PHRASES`, `BRAND_ALIASES`); `scripts/scrape.ts` and `scripts/backfill-brand-keys.ts` import them. Don't re-duplicate. `brand:backfill` is non-destructive: it never nulls an existing `brandKey` and never changes an existing `Product.brandKey`.
- **Review expand/link dry-runs case by case before applying**: generic `modelKey`s produce false "exact" matches (distinct Ozeta bags → crossbag-5x5, Mighty accessories → Mighty+ vaporizer). When in doubt, apply approved links via a targeted `link-ronda*-reviewed.ts`-style script instead of running the auto-linker's `--apply`.
- **Curation unlinks manual work**: `curate-comparable-products.ts` detaches offers during fuzzy matching. Correct order: 1) curate, 2) manually link offers, 3) audit **without re-curating**.
- **Scraper hygiene**: never persist category/brand/search/pagination URLs as products. Piranha/GrowBarato are PrestaShop — only `.html` product URLs are valid; anything else must be cleaned as stale.
- In this Next 16 codebase, `params` of dynamic routes and `searchParams` are typed as **Promises** — keep that pattern.
- **Reading `searchParams` in a route that also has `generateStaticParams` makes it dynamic**, which streams the response and freezes the status at 200 — so `notFound()` renders the not-found body with a 200 (soft-404). This was investigated on 14 Jul 2026 and deliberately left as is: Next injects `<meta name="robots" content="noindex">` on `notFound()`, so search engines never index those pages and the SEO goal is already met. Don't reopen it without a concrete Search Console problem.
- Run `npm run lint` and `npm run build` before finishing any app/scraper/matching/derived-data change. If you touched the scraper, also do a limited scrape run to validate no bad URLs persist.
