# soloWeed Codebase Analysis

This document summarizes the architectural, script, testing, and UI layout findings from exploring the soloWeed codebase at `E:\soloWeed`.

---

## 1. package.json & Dependencies Analysis

### Dependencies (`package.json`)
The project utilizes **Next.js 16 (App Router)** and **React 19** with **Prisma (SQLite)** as the persistence layer, accompanied by local machine learning tools for embedding-based matching.

*   **`next` (16.2.6) / `react` & `react-dom` (19.2.4)**: The core web application frameworks.
*   **`@prisma/client` (6.19.3) & `prisma` (6.19.3)**: Object-Relational Mapper for SQLite.
*   **`@xenova/transformers` (2.17.2)**: Used for local execution of machine learning models (specifically CLIP embeddings) to match offers visually.
*   **`cheerio` (1.0.0)**: Used in scraping scripts to parse HTML pages.
*   **`recharts` (3.9.0)**: Used to generate charts in the user interface, notably the price history timeline.
*   **`sharp` (0.34.5)**: Used for image processing and optimization.
*   **`tsx` (4.21.0)**: Used to execute TypeScript scripts directly without compiling first.
*   **`tailwindcss` (4.0.0) / `@tailwindcss/postcss` (4.0.0)**: Modern styling framework.
*   **`eslint` (9.0.0) / `eslint-config-next` (16.2.6)**: Linter tools.

### Scripts Analysis
The project has defined automated pipelines for development, scraping, matching, and database maintenance:

*   **Development & Build**:
    *   `npm run dev` (`next dev --webpack`): Runs Next.js development server explicitly using Webpack. Turbopack is disabled because of unresolved bundling issues with Prisma client.
    *   `npm run build` (`next build --webpack`): Compiles the Next.js app, also forced to use Webpack.
    *   `npm run lint` (`eslint`): Lints the codebase.
*   **Database Operations**:
    *   `npm run db:generate` (`prisma generate`): Regenerates the Prisma Client.
    *   `npm run db:migrate` (`prisma migrate dev`): Applies database migrations.
    *   `npm run db:studio` (`prisma studio`): Opens Prisma Studio to view/edit database entries.
    *   `postinstall` (`prisma generate`): Automatically triggers Prisma Client generation on install.
*   **Testing**:
    *   `npm run test`: Runs the test suite via Node's native test runner: `tsx --test tests/password.test.ts tests/export-catalog-audit.test.ts tests/matching.test.ts tests/catalog.test.ts`.
*   **Data Scraper**:
    *   `npm run scrape` (`tsx scripts/scrape.ts`): The main scraper that targets Chilean growshops (Astro Growshop, Fumetas, Piranha, GrowBarato).
*   **Product Matching & Curation**:
    *   `npm run match:auto` (`tsx scripts/auto-match-offers.ts`): Matches offers to existing products.
    *   `npm run match:image` (`tsx scripts/match-by-image.ts`): Explores visual matching using raw dHash.
    *   `npm run match:embedding` (`tsx scripts/match-by-embedding.ts`): Executes visual semantic matching via CLIP.
    *   `npm run catalog:curate` (`tsx scripts/curate-comparable-products.ts`): Normalizes and generates comparison catalog items.
    *   `npm run catalog:expand` (`tsx scripts/expand-curated-product-offers.ts`): Attaches remaining unmatched offers to products using a fuzzy match score.
    *   `npm run catalog:audit:export` (`tsx scripts/export-catalog-audit.ts`): Audits the product mapping coverage.
    *   `npm run brand:backfill` (`tsx scripts/backfill-brand-keys.ts`): Fills missing brand identifier keys in database.
    *   `npm run model:backfill` (`tsx scripts/backfill-model-keys.ts`): Fills missing model keys/slugs in database.

---

## 2. Test Framework Configuration

*   **No Third-Party Test Runner**: There are no configurations or dependencies for Jest, Vitest, Playwright, Cypress, or Mocha.
*   **Native Node.js Test Runner**: The project leverages the native `node:test` framework introduced in newer Node.js releases, running tests in TypeScript files using `tsx --test`.
*   **Tests Location**: Inside `tests/` directory:
    *   `tests/catalog.test.ts` — Tests sorting algorithms, price filters, coverage badges, and search term lookups.
    *   `tests/export-catalog-audit.test.ts` — Tests catalog exports.
    *   `tests/matching.test.ts` — Tests normalizations, model key generation, and matching logic.
    *   `tests/password.test.ts` — Tests password hashing and validation.
*   **Test Assertions**: Standard `node:assert/strict` library is used (e.g. `assert.equal`, `assert.deepStrictEqual`).

---

## 3. Frontend Entry Points, Pages & Component Layouts

### Catalog Home Page (`src/app/page.tsx`)
Renders the primary landing and catalog browsing dashboard. It restricts visible items to those comparable across **2 or more stores** (or curated items with a valid `productId`).

*   **Container Elements & CSS Classes**:
    *   Wrapper: `<main className="min-h-screen overflow-hidden bg-white dark:bg-[#09090b] text-zinc-900 dark:text-[#fafafa] transition-colors duration-300">`
    *   Radial Background Overlay: `<div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#C0FF00_0,transparent_20%),radial-gradient(circle_at_80%_20%,#39FF14_0,transparent_20%)] opacity-20 pointer-events-none" />`
    *   Header component: `<SiteHeader subtitle="Compara parafernalia" />`
    *   Search Form: `<form className="grid gap-3 rounded-3xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-[#18181b]/60 p-4 shadow-2xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all hover:border-black/20 ...">`
    *   Search Input: `<input className="min-h-[72px] rounded-2xl border border-black/5 ... px-6 text-lg sm:text-xl font-medium text-zinc-900 dark:text-white outline-none placeholder:text-zinc-500 ... font-mono ..." name="q" placeholder="Busca bongs, moledores, RAW, vaporizadores..." defaultValue={query} />`
    *   Search Action Button: `<button className="min-h-[72px] rounded-2xl bg-accent px-10 text-lg font-black text-[#09090b] transition-all hover:-translate-y-1 hover:bg-accent-hover hover:shadow-[0_10px_30px_rgba(192,255,0,0.4)] active:translate-y-0 uppercase tracking-widest font-mono">Buscar ofertas</button>`
    *   Coverage Stats Panel (Total, 3 stores, 2 stores): `<div className="grid grid-cols-3 divide-x divide-black/10 dark:divide-white/10 border-y border-black/10 dark:border-white/10 py-10">`
    *   Sidebar Sidebar wrapper: `<aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">`
        *   Contains `<CategoryFilters ... />` and `<StoreFilters ... />`.
        *   Contains "Visitar tiendas" card lists with links.
    *   Offers Grid wrapper: `<div className="grid gap-4 xl:grid-cols-2">` which maps offers into `<OfferCard ... />`.
    *   Pagination controls wrapper: `<div className="mt-8 flex items-center justify-between rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#18181b] p-4 shadow-sm ...">`

### Offer Card Component (`src/components/offer-card.tsx`)
The representative card structure for catalog item browsing on the homepage.

*   **Structure**:
    *   Wrapper: `<article className="relative group grid min-w-0 gap-5 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#121214] p-4 shadow-sm dark:shadow-none transition-all duration-500 ease-out hover:z-10 hover:-translate-y-2 hover:border-black/20 dark:hover:border-white/20 hover:bg-zinc-50/50 dark:hover:bg-[#1a1a1d]/80 hover:backdrop-blur-xl hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.15)] ... sm:grid-cols-[180px_minmax(0,1fr)]">`
    *   Rank Badge: `<span className="absolute left-3 top-3 rounded-md bg-white/90 dark:bg-[#09090b]/90 px-2.5 py-1 text-[10px] font-black tracking-widest text-zinc-500 ... font-mono border ...">#{rank}</span>`
    *   Category, Brand & Coverage Badge list: `<div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[10px] font-bold uppercase tracking-widest font-mono text-zinc-500 ...">`
    *   Title: `<h3 className="mb-4 text-xl font-black leading-tight tracking-[-0.02em] text-zinc-900 dark:text-white/90 ... line-clamp-2">{offer.title}</h3>`
    *   Stock Badge (if out of stock): `<div className="mb-4 inline-flex w-fit items-center gap-2 rounded-md border border-orange-500/30 bg-orange-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-orange-600 ...">`
    *   Price Box: `<span className="text-3xl font-black tracking-tighter text-zinc-900 dark:text-white">`
    *   Discount Badge: `<span className="rounded-md bg-purple-100 dark:bg-[#7f5af0]/20 ... px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-purple-700 ...">-{discount}%</span>`
    *   Ahorro Badge (Savings when comparing multiple stores): `<span className="rounded-md bg-accent/20 border border-accent/30 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-black ... font-mono">Ahorra {formatPrice(storeSavings)}</span>`
    *   CTA Buttons:
        *   **Comparable**: If the offer is mapped to a product and matches >1 stores, renders `<Link href={\`/productos/\${offer.product.brandKey}/\...}\` className="... bg-accent ... uppercase tracking-[0.1em] font-mono">Comparar</Link>`
        *   **Direct Store Link**: Otherwise, renders `<a href={offer.url} className="... border bg-black/5 dark:bg-white/5 text-zinc-700 dark:text-white/80 hover:border-accent/50 ...">Ir a tienda</a>`

### Product Detail View (`src/app/productos/[...slug]/page.tsx`)
Serves `/productos/<slug>` and `/productos/<brandKey>/<modelSlug>` dynamically. It acts as the comparison grid for a unified product.

*   **Structure**:
    *   Wrapper: `<main className="min-h-screen bg-white dark:bg-[#09090b] text-zinc-900 dark:text-[#fafafa] transition-colors duration-300">`
    *   Title Section: `<h1 className="mt-5 max-w-4xl text-4xl font-black leading-[0.95] tracking-[-0.06em] sm:text-6xl lg:text-7xl">{product.name}</h1>`
    *   Quick Info Summaries: `<div className="mt-8 grid gap-3 sm:grid-cols-3">` which inserts `<SummaryCard label="Growshops" value={...} />`, `<SummaryCard label="Con precio" value={...} />`, and `<SummaryCard label="Coincidencias" value={...} />`.
    *   Sidebar layout: `<section className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[320px_1fr] lg:px-10">`
    *   Sidebar Contents:
        *   Store Coverage Status: `<div className="rounded-xl border border-black/10 ... bg-zinc-50 dark:bg-[#18181b] p-5 shadow-xl ...">` iterating over `<StoreStatusRow key={row.store.id} row={row} />`.
        *   Metadata Details: Product ID, updated timestamp, exact coverage %, count with stock, price range.
    *   Comparison Grid: `<div className="grid gap-4 xl:grid-cols-2">` which renders `<StorePriceCard key={row.store.id} minPrice={minPrice} productId={product.id} row={row} />`.
    *   Price History Section: Renders `<PriceHistoryChart ... />` component.
    *   Related Products Section: Lists other items in the same category linking via `productPath(related.brandKey, related.modelSlug)`.

### Store Price Card Component (`src/components/store-price-card.tsx`)
Individual card within the comparison details representing a single store's pricing for the current product.

*   **Structure**:
    *   Wrapper: `<article className="relative overflow-hidden rounded-xl border border-black/10 dark:border-white/10 bg-zinc-50/70 dark:bg-[#18181b]/70 p-5 shadow-xl backdrop-blur-xl dark:shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-all hover:-translate-y-1 hover:shadow-2xl ... hover:border-accent/50 duration-500">`
    *   Store Header: Contains store name, system platform, and a Stock label:
        *   Stock indicator: `<span className="rounded px-3 py-1 text-xs font-black font-mono ... bg-accent/20 text-black dark:text-accent-text border border-accent/30">Con stock</span>` (or red variant for "Sin stock").
    *   Offer Details Grid (Layout: `grid gap-4 sm:grid-cols-[120px_1fr]`):
        *   Badges:
            *   Lowest price: `<span className="rounded bg-accent/20 px-3 py-1 text-xs font-black text-black dark:text-accent-text border border-accent/30 font-mono transition-colors">Precio menor</span>`
            *   Suggested Match: `<span className="rounded bg-amber-500/10 dark:bg-amber-500/20 px-3 py-1 text-xs font-black text-amber-600 dark:text-amber-400 border border-amber-500/20 dark:border-amber-500/30 font-mono transition-colors">Match sugerido</span>`
        *   Title: `<h3 className="mt-3 text-lg font-black leading-tight tracking-[-0.02em] text-zinc-900 dark:text-white">{offer.title}</h3>`
        *   Meta info (sourceCategory, last seen timestamp).
    *   Pricing Panel:
        *   Wrapper: `<div className="mt-5 rounded-lg bg-black/5 dark:bg-black/40 p-5 text-zinc-900 dark:text-white border border-black/5 dark:border-white/5 transition-colors backdrop-blur-md">`
        *   Price: `<span className="text-4xl font-black tracking-[-0.06em] text-accent-text drop-shadow-[0_0_15px_rgba(192,255,0,0.3)] transition-all">{formatPrice(offer.price)}</span>`
    *   CTA Button: `<a className="mt-5 block rounded-lg bg-accent px-5 py-3 text-center text-sm font-black text-black transition-all hover:-translate-y-1 hover:bg-accent-hover hover:shadow-[0_10px_20px_rgba(192,255,0,0.3)] font-mono" href={offer.url} ...>Ir a tienda</a>`

---

## 4. Key Architectural Decisions & Database Rules (Invariants)

*   **Webpack Invariant**: Do not use Next.js Turbopack; always run dev and build with `--webpack` due to Prisma client bundling requirements.
*   **Database Invariant**: The database configured via `DATABASE_URL` in `.env` is currently `prisma/dev_recovered.db`. Direct query/modification of raw `dev.db` is strictly prohibited.
*   **Slug Integrity**: The public route format must strictly follow `/productos/<brandKey>/<modelSlug>`. Slugs should not repeat category terminology or brand prefixes.
*   **Frozen 4-Store Products**: Products matching across all 4 stores are frozen. Curation scripts protect them via the backup JSON file (`reports/protected-links.json`) to prevent unlinking.
*   **No Manual DB Edits**: Database corrections must occur through migration files, targeted fix scripts, or curation pipelines rather than manual SQLite updates.
