# Handoff Report: Playwright E2E Testing Plan

This document summarizes the exploration, reasoning, design, and validation strategy for establishing the soloWeed E2E test suite.

---

## 1. Observation
- **Project Structure**:
  - `E:\soloWeed\PROJECT.md` specifies:
    ```markdown
    - Framework: Playwright E2E Testing Framework
    - Test Target: Next.js Web App running on local or production port (default http://localhost:3000)
    - Database: SQLite (read-only for tests)
    ```
  - `E:\soloWeed\package.json` contains:
    - `"dev": "next dev --webpack"` (line 6)
    - `"test": "tsx --test tests/password.test.ts tests/export-catalog-audit.test.ts tests/matching.test.ts tests/catalog.test.ts"` (line 10)
    - There are no existing Playwright or E2E dependencies or configuration files.
- **Frontend Selectors & UI Layout**:
  - `src/components/offer-card.tsx` renders comparable offer links (lines 122-128):
    ```typescript
    offer.product?.brandKey && offer.product.modelSlug && offer.storeCount > 1 ? (
      <Link
        className="... bg-accent ... font-mono"
        href={`/productos/${offer.product.brandKey}/${offer.product.modelSlug}`}
      >
        Comparar
      </Link>
    )
    ```
  - `src/app/page.tsx` renders:
    - A search input (lines 123-128): `<input name="q" placeholder="Busca bongs, moledores, RAW, vaporizadores..." ... />`
    - A search button (lines 130-132): `<button className="... bg-accent ...">Buscar ofertas</button>`
    - Dynamic coverage stats (lines 140-155): "Cobertura Total", "En 3 Tiendas", "En 2 Tiendas"
    - Pagination buttons (lines 235-259) using text "Anterior" and "Siguiente".
  - `src/app/productos/[...slug]/page.tsx` renders:
    - Heading (line 194): `<h1 className="..."> {product.name} </h1>`
    - Summary Cards (lines 204-208): "Growshops", "Con precio", "Coincidencias"
    - Store status rows title (line 217): `h2: "Cobertura por growshop"`
    - Price comparison cards title (line 244): `h2: "Visual de precios por tienda"`
    - Related products title (line 285): `h2: "Otras comparaciones de ..."`
  - `src/app/productos/[...slug]/price-history-chart.tsx` renders:
    - Heading (line 109): `h3: "Evolución de precios"`

---

## 2. Logic Chain
1. **Infrastructure Integration**:
   - Since the application currently uses the native Node test runner (`tsx --test`) for unit and integration testing, adding Playwright requires introducing it as a development dependency.
   - Adding script entries `"test:e2e"`, `"test:e2e:ui"`, `"test:e2e:debug"`, and `"test:e2e:install"` to `package.json` isolates the E2E suite without affecting unit testing workflows.
2. **Configuration Alignment**:
   - Next.js requires a build/dev process to run. A Playwright `webServer` block in `playwright.config.ts` running `npm run dev` ensures the target environment is spun up dynamically before executing tests.
   - The timeout parameter needs to be set to `120 * 1000` because Next.js has to bundle modules (forced to use Webpack due to Prisma client bundling constraints highlighted in `AGENTS.md`) on initial startup, which can take time.
3. **Selector Selection**:
   - For catalog loading, targeting the `<article>` elements represents individual `OfferCard` units.
   - For comparing items, looking up `a:has-text("Comparar")` matches the dynamic catalog links which route to `/productos/<brandKey>/<modelSlug>`.
   - For search, selecting `input[name="q"]` and clicking `button:has-text("Buscar ofertas")` simulates exact user behavior.
   - For pagination, using text-based queries for `Siguiente` and `Anterior` aligns with the custom Next.js `Link` pagination controls.
   - For product details, headings like `h1` (product title), `h2:has-text("Cobertura por growshop")` (sidebar), `h2:has-text("Visual de precios por tienda")` (grid), `h3:has-text("Evolución de precios")` (chart), and `h2:has-text("Otras comparaciones de")` (related products) serve as robust assertion targets.

---

## 3. Caveats
- **Active Database Integrity**: The test runner acts in a read-only manner, but it relies on an active database to load comparable products. If the database (`prisma/dev_recovered.db` as stated in `.env`) has no products matched across $\geq 2$ stores, the homepage won't display any "Comparar" buttons, which will break the navigation test. To avoid this, it's assumed that the database is populated prior to running tests.
- **Port Reuse**: If another application runs on port 3000, Playwright will attempt to connect to it. The parameter `reuseExistingServer: !process.env.CI` will reuse a running instance. Developers must ensure the running server is the correct build.

---

## 4. Conclusion
We have formulated a robust testing strategy and implementation plan, complete with setup scripts, configuration details, and the full structure for `tests/e2e/catalog.spec.ts`. All selectors and routes conform to the current Next.js App Router codebase and database structure.

---

## 5. Verification Method
- **Implementation Verification**:
  - Inspect the planned structure in `E:\soloWeed\.agents\explorer_e2e_1\analysis.md`.
  - Once implemented, verification can be run via:
    ```bash
    npm run test:e2e
    ```
  - Inspect the HTML test reports under `./playwright-report/` to confirm that all test assertions passed.
