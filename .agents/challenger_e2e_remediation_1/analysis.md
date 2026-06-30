# Adversarial Review — E2E Testing Suite

## Challenge Summary

**Overall risk assessment**: MEDIUM

The refactored E2E testing suite is stable and correct under local execution (all 45 tests passed across 5 consecutive iterations). However, the selectors are highly fragile to wording changes, minor spelling adjustments, layout changes, or localization. Additionally, the tests are highly dependent on the database state and are prone to network/CPU race conditions on client-side RSC transitions (Next.js Suspense loading skeletons).

---

## Challenges

### [High] Wording and Language Fragility in Element Locators
- **Assumption challenged**: UI text, button labels, and headings will remain static and identical.
- **Attack scenario**: A minor copy change, minor spelling correction, or addition of localization (e.g., changing "Comparar" to "Ver Precios", "Ir a tienda" to "Comprar", "Siguiente" to "Siguiente →" or "Next", or "Precio detectado" to "Precio") will immediately break multiple assertions across all three test flows.
- **Blast radius**: Test suite fails entirely, halting the build pipeline for purely aesthetic or minor copy changes.
- **Mitigation**: 
  - Introduce semantic test attributes (`data-testid`) for key navigational and structural components (e.g., `data-testid="page-indicator"`, `data-testid="btn-siguiente"`, `data-testid="btn-anterior"`, `data-testid="price-card"`, `data-testid="link-comparar"`), and query using `page.getByTestId()`.
  - Use more flexible role/regex queries like `page.getByRole('link', { name: /comparar/i })` instead of exact text matches like `page.locator('a:text("Comparar")')`.

### [Medium] Next.js RSC Navigation Race Condition & Flakiness
- **Assumption challenged**: Next.js Server Component page routing is instant, or the default Playwright assertion timeout (5s) will always be sufficient.
- **Attack scenario**: During pagination or search transitions, Next.js transitions through a loading skeleton (`src/app/loading.tsx`). In a slow CI container or under high CPU load, the server components' data fetching and rendering can exceed 5 seconds.
- **Blast radius**: The page indicator or search results won't update in time, leading to `expect(pageIndicator).toHaveText(...)` or `expect(firstMatch).toBeVisible()` timing out and causing intermittent, non-deterministic test failures (flakiness).
- **Mitigation**: 
  - Increase the assertion timeout specifically for transitions (e.g. `{ timeout: 10000 }`).
  - Explicitly await the disappearance of the loading skeleton (or wait for the shimmer elements to be hidden) before verifying page content.

### [Medium] Implicit Database State Dependency
- **Assumption challenged**: The test environment database is always pre-seeded with at least 41 comparable products (with `storeCount >= 2`) and at least one product containing the term "raw".
- **Attack scenario**: Running tests on a clean environment or after a standard database reset (`npm run db:migrate`) without manual data restoration.
- **Blast radius**: The E2E tests fail to find any "Comparar" links, the pagination component (`data.totalPages > 1`) is not rendered, and the search query returns the empty state instead of results.
- **Mitigation**: Create an E2E-specific setup script that seeds a controlled SQLite testing database (e.g., `test_e2e.db`) with a minimal reproducible set of products, and run the dev server pointing to that database (`DATABASE_URL=file:./test_e2e.db`) during E2E tests.

### [Low] Fragile Currency & Status Badge Locators
- **Assumption challenged**: Currency symbols and fallback strings will always use specific Spanish phrases (`"Sin dato"`) and the `$` sign.
- **Attack scenario**: Changing the locale/currency formatting (e.g. switching formatting to `CLP 15.000` or changing empty badge value to `Sin información` or `N/A`).
- **Blast radius**: The status row locator in `aside` (`page.locator('aside').locator('div:has-text("Sin dato"), div:has-text("$")')`) will fail to match.
- **Mitigation**: Target the status badges structure or class names directly, or use data attributes rather than raw string values containing currency characters or transient text.

---

## Stress Test Results

- **Run 1**: 9/9 tests passed in 1.8m
- **Run 2**: 9/9 tests passed in 1.6m
- **Run 3**: 9/9 tests passed in 1.2m
- **Run 4**: 9/9 tests passed in 1.1m
- **Run 5**: 9/9 tests passed in 1.2m
- **Total**: 45/45 tests successfully passed.

---

## Unchallenged Areas

- **Internal Reports Section** (`src/app/interno/reportes`): Out of scope for public-facing catalog and detail page E2E verification.
- **Scraper / Matcher Code**: Handled by unit and integration tests under `tests/matching.test.ts`.

---

## Code Modification Audit

- Verified that no implementation files inside `src/` have been modified in the current branch. All changes are confined to E2E test files (`tests/e2e/`), configuration, and metadata.
