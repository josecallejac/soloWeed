# Handoff Report — E2E Testing Strategy and Implementation Plan

## 1. Observation
- **Target Web Application Environment**: Standard Next.js development and production ports run on `http://localhost:3000` (observed in `E:\soloWeed\PROJECT.md:20`: `Port: http://localhost:3000 (standard Next.js dev port)`).
- **Core Route Mappings**: 
  - Homepage is `/` (observed in `E:\soloWeed\PROJECT.md:22`: `Homepage: '/'`).
  - Search uses standard forms (observed in `E:\soloWeed\PROJECT.md:23`: `Search: form inputs and search button`).
  - Product comparison slug layout (observed in `E:\soloWeed\PROJECT.md:25-26`: `/productos/<brandKey>/<modelSlug>`).
- **Missing E2E Infrastructure**: `package.json` contains no Jest, Vitest, Cypress, or Playwright packages or script entry points. The only current test command is native (observed in `E:\soloWeed\package.json:10`: `"test": "tsx --test tests/password.test.ts tests/export-catalog-audit.test.ts tests/matching.test.ts tests/catalog.test.ts"`).
- **Search DOM elements**: 
  - Search input: `<input name="q" placeholder="Busca bongs, moledores, RAW, vaporizadores..." ... />` (observed in `src/app/page.tsx:123-128`).
  - Submit button: `<button className="... bg-accent ...">Buscar ofertas</button>` (observed in `src/app/page.tsx:130-132`).
- **Pagination elements**: 
  - Link texts are `Anterior` and `Siguiente` (observed in `src/app/page.tsx:239, 254`).
  - Progress text is `{data.page} / {data.totalPages}` (observed in `src/app/page.tsx:246`).
- **Product Detail view elements**: 
  - Title: `h1` displaying `{product.name}` (observed in `src/app/productos/[...slug]/page.tsx:194-196`).
  - Stats badges: "Growshops", "Con precio", and "Coincidencias" (observed in `src/app/productos/[...slug]/page.tsx:205-207`).
  - Sidebar headings: "Cobertura por growshop" and "Datos del catalogo" (observed in `src/app/productos/[...slug]/page.tsx:217, 226`).
  - Detail grid header: "Visual de precios por tienda" (observed in `src/app/productos/[...slug]/page.tsx:244`).
  - Related section header: "Sigue comparando" (observed in `src/app/productos/[...slug]/page.tsx:283`).

## 2. Logic Chain
1. To introduce automated user interaction testing, a full-browser automation library is required. Playwright is selected because of its native support for React 19/Next 16, parallelized runs, visual reports, and built-in local webServer lifecycle control.
2. Based on the observed DOM structure in `src/app/page.tsx` and `src/app/productos/[...slug]/page.tsx`, we can target elements using Playwright's role locators and text selectors (e.g. `page.getByRole('link', { name: 'Comparar' })`, `page.getByPlaceholder('Busca bongs...')`).
3. Since Next.js uses dynamic imports and SQLite data states, the E2E runner configuration (`playwright.config.ts`) must support setting up the server automatically. Therefore, the `webServer` option is configured to run `npm run dev` locally and `npm run start` in CI, with a fallback timeout of 120s to ensure dev compilation doesn't timeout the test runner.
4. The catalog's state has comparable offers when at least two stores share a product mapping. The homepage lists "Comparar" buttons for these. By asserting that navigating from clicking "Comparar" to a URL match `/productos/<brand>/<model>` works and checking the elements, we establish a robust user flow test.

## 3. Caveats
- **Read-Only**: No code modifications have been made to the repository. The proposed config files and tests are fully planned and written to the findings report (`E:\soloWeed\.agents\explorer_e2e_2\analysis.md`), but they are not created on disk in the project.
- **Database Seed Dependency**: The tests assume the local SQLite database has active data (such as products under "RAW"). If the database is completely empty (e.g. fresh clone before any scrapes/curations), the assertions for comparable offers and search results might fail. The verification method specifies compiling or running migrates/curations if needed.

## 4. Conclusion
We have established a complete testing strategy and implementation plan for soloWeed's E2E tests, utilizing Playwright. The plan is documented in detail in `E:\soloWeed\.agents\explorer_e2e_2\analysis.md` and contains the exact packages, package.json scripts, `playwright.config.ts` configuration, and the fully written `tests/e2e/catalog.spec.ts` test spec.

## 5. Verification Method
The plan can be verified independently by:
1. Reviewing the contents of `E:\soloWeed\.agents\explorer_e2e_2\analysis.md` to confirm it covers all requested points (packages, config file, spec implementation, and user flows).
2. Verifying the validity of the CSS selectors and text inputs proposed in the test spec against `src/app/page.tsx` and `src/app/productos/[...slug]/page.tsx`.
3. Running a dry-run conceptual walkthrough of the E2E script flows to ensure no syntax errors exist.
