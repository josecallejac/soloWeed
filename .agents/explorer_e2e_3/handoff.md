# Handoff Report: Playwright E2E Testing Strategy and Plan

This report details the findings and proposals for setting up Playwright E2E tests for the soloWeed codebase.

---

## 1. Observation

During my codebase analysis, I observed the following configurations, code snippets, and UI selectors:

*   **Existing Test Setup (`package.json:10`)**:
    ```json
    "test": "tsx --test tests/password.test.ts tests/export-catalog-audit.test.ts tests/matching.test.ts tests/catalog.test.ts",
    ```
    This indicates a unit/integration testing suite running on native Node.js test runner using `tsx`. There was no configuration or packages for E2E frameworks like Playwright.

*   **Homepage Search Form (`src/app/page.tsx:122-133`)**:
    ```tsx
    <form className="grid gap-3 rounded-3xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-[#18181b]/60 p-4 shadow-2xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all hover:border-black/20 dark:hover:border-white/20 focus-within:border-accent/50 focus-within:shadow-[0_0_40px_rgba(192,255,0,0.15)] md:grid-cols-[1fr_auto]">
      <input
        className="min-h-[72px] rounded-2xl border border-black/5 dark:border-white/5 bg-white dark:bg-[#09090b] px-6 text-lg sm:text-xl font-medium text-zinc-900 dark:text-white outline-none placeholder:text-zinc-500 dark:placeholder:text-white/40 focus:border-accent focus:ring-2 focus:ring-accent/20 font-mono transition-all"
        name="q"
        placeholder="Busca bongs, moledores, RAW, vaporizadores..."
        defaultValue={query}
      />
      {selectedCategory ? <input name="category" type="hidden" value={selectedCategory} /> : null}
      <button className="min-h-[72px] rounded-2xl bg-accent px-10 text-lg font-black text-[#09090b] transition-all hover:-translate-y-1 hover:bg-accent-hover hover:shadow-[0_10px_30px_rgba(192,255,0,0.4)] active:translate-y-0 uppercase tracking-widest font-mono">
        Buscar ofertas
      </button>
    </form>
    ```
    The input is targetable via `input[name="q"]` and the submission button via `button:has-text("Buscar ofertas")`.

*   **Comparison Home Offer Cards (`src/app/page.tsx:225-229`)**:
    The offers are mapped into `OfferCard` components which wrap each element in an `article` (specifically matching class `.group`). In `src/components/offer-card.tsx`, comparable offers are shown with:
    ```tsx
    <Link href={`/productos/${offer.product.brandKey}/${offer.product.modelSlug}`} className="... bg-accent ... uppercase tracking-[0.1em] font-mono">Comparar</Link>
    ```
    This shows we can locate comparable offers using the link target path starting with `/productos/` or the button text `"Comparar"`.

*   **Pagination Controls (`src/app/page.tsx:231-260`)**:
    The controls use buttons for `"Anterior"` and `"Siguiente"` with text indicator `<page> / <totalPages>`.

*   **Product Detail View (`src/app/productos/[...slug]/page.tsx:194-208`)**:
    Renders `h1` for the product name, and includes:
    ```tsx
    <div className="mt-8 grid gap-3 sm:grid-cols-3">
      <SummaryCard label="Growshops" value={String(stores.length)} />
      <SummaryCard label="Con precio" value={`${storesWithPrice.length}/${stores.length}`} />
      <SummaryCard label="Coincidencias" value={String(suggestedMatchCount)} />
    </div>
    ```

*   **Comparison Cards & Status Sidebar (`src/app/productos/[...slug]/page.tsx:216-234`)**:
    Renders store prices and coverage:
    ```tsx
    <h2 className="text-xl font-black font-mono text-zinc-900 dark:text-white/90 uppercase tracking-widest transition-colors">Cobertura por growshop</h2>
    ```
    Iterating over `StoreStatusRow` which renders name and stock price or "Sin dato".
    The page comparison grid maps `StorePriceCard` elements which display:
    *   Store name (`p.text-2xl.font-black`)
    *   Stock label (`"Con stock"` or `"Sin stock"`)
    *   A hyperlink with text `"Ir a tienda"` or `"Ver growshop"`.

*   **Recharts Chart (`src/app/productos/[...slug]/page.tsx:263-276`)**:
    Renders `PriceHistoryChart`, which internally utilizes SVG components matching the `.recharts-responsive-container` class.

*   **Related Products (`src/app/productos/[...slug]/page.tsx:280-317`)**:
    Contains related comparisons under header `"Sigue comparando"`, mapping links to other comparable products.

---

## 2. Logic Chain

1.  **Playwright Installation**: Since this is a TypeScript codebase running Next.js, installing `@playwright/test` is the best practice. It wraps Chromium, Firefox, and WebKit into a single script-oriented interface and natively supports TS test configuration files.
2.  **Configuration**: The local server command is `npm run dev` (running Next.js with `--webpack` configuration). Playwright's `webServer` option should execute this command, verify it's active at `http://localhost:3000`, and reuse it in local development environments.
3.  **Home Page Test Assertions**: The catalog only renders items if they have visibility (`item.storeCount > 1`). In the database (`dev_recovered.db`), multiple products meet this standard. Thus, loading the index `/` should yield visible `<article>` components. E2E tests can verify page loading by ensuring elements containing `"SoloWeed"`, `"Cobertura Total"`, and `article` cards are present.
4.  **Interaction Flows**:
    *   **Search**: Filling `input[name="q"]` and clicking `button:has-text("Buscar ofertas")` generates a client navigation to `/?q=...`. The test can assert that the URL changes to match `q=...` and verify search results.
    *   **Pagination**: If `totalPages > 1`, pagination controls will be active. Checking for page indicators containing `" / "` and clicking `"Siguiente"` allows verifying `page=2` transitions.
    *   **Detail Navigation**: Product detail views are dynamic routing files served under `/productos/<brandKey>/<modelSlug>`. Clicking `a:has-text("Comparar")` transitions the page.
    *   **Detail View Assertions**: The detail view contains cards representing various store prices. Verification consists of inspecting elements for `StorePriceCard` (by searching for buttons containing `"Ir a tienda"` or `"Ver growshop"`), "Cobertura por growshop" sidebar list, metadata cards, the chart wrapper (`.recharts-responsive-container`), and related product links (`section:has-text("Sigue comparando")`).

---

## 3. Caveats

*   **No local E2E verification**: Since the workspace must not be modified and code must not be run, no actual browsers were launched. The plan is based on static analysis of pages, models, and JSX structures.
*   **Database state dependency**: The E2E tests assume that there is some data in the database. In local development or CI, the database must contain comparable items for the navigation test to succeed. If the database is empty, the test will fall back to displaying the `EmptyState` component.

---

## 4. Conclusion

The testing strategy and implementation plan for soloWeed's E2E test suite are fully documented and structured:
1.  **Playwright setup**: Requires `@playwright/test`, package.json script additions, and the `playwright.config.ts` root configuration.
2.  **Test specification**: The test suite `tests/e2e/catalog.spec.ts` covers the complete set of required E2E flows (catalog loading, search, pagination, comparison navigation, and detail views) with selectors matched to the actual DOM layout.

---

## 5. Verification Method

Once implemented, the setup and tests can be verified using the following steps:
1.  Verify files are created at `/playwright.config.ts` and `/tests/e2e/catalog.spec.ts`.
2.  Install dependencies: `npm install` (to install `@playwright/test`) and `npx playwright install`.
3.  Run the tests using the command:
    ```bash
    npm run test:e2e
    ```
4.  Ensure that all test scenarios complete successfully.
5.  **Invalidation Conditions**: The E2E tests will fail or become invalid if:
    *   Next.js starts on a port other than `3000`.
    *   The "Comparar" link text/href format is modified.
    *   Fuzzy pagination hides items.
