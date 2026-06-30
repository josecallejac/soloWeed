# E2E Test Suite Adversarial Analysis

This report documents the adversarial verification of the Playwright E2E testing suite for **soloWeed**.

---

## 1. Selector Robustness Analysis

The E2E tests in `tests/e2e/catalog.spec.ts` are almost entirely dependent on **exact text content** and **DOM structure**. While they are robust against theme changes (since they do not target styling classes like Tailwind classes), they are highly vulnerable to small changes in wording, spelling, localization, and DOM tagging.

### Fragility Index: HIGH

Here are the specific fragile selectors identified:

| Selector in Code | Fragility Risk | Attack Scenario / Why It Will Break | Suggested Mitigation |
| :--- | :--- | :--- | :--- |
| `h2:has-text("Comparaciones encontradas")` | **Medium-High** | Breaks if the heading text is changed, translated, or if the tag is refactored (e.g., from `h2` to `div` or `h3`). | Use role-based locator: `page.getByRole('heading', { name: /comparaciones encontradas/i })` or a `data-testid`. |
| `a:text("Comparar")`.first() | **Medium-High** | Breaks if the button label is modified (e.g., to "Ver precios" or "Comparar precios") or if a card has a different language. | Use `data-testid="compare-link"` on the link. |
| `page.locator('span').filter({ hasText: /^\s*\d+\s*\/\s*\d+\s*$/ }).first()` | **Critical** | Extremely fragile. If the DOM contains another span matching a slash format (e.g., "1/2 unit", "4/4 stores"), `.first()` might select the wrong element. If the pagination format is translated (e.g., "Página 1 de 10"), the regex fails completely. | Add a specific class, id, or `data-testid="page-indicator"` to the span. |
| `a:has-text("Siguiente")` and `a:has-text("Anterior")` | **High** | Breaks if text is changed (e.g., replacing with icons like `>` and `<`) or translated (e.g., "Next" / "Previous"). | Use role-based selector: `page.getByRole('link', { name: /siguiente/i })` or `data-testid`. |
| `h3:has-text("Aun no hay ofertas asociadas")` | **High** | Accents/Spelling. The text in `src/components/empty-state.tsx` is currently spelled without an accent (`Aun`). If a developer corrects it to `Aún` (with an accent on the `u`), the case-sensitive exact `:has-text` matcher will fail. | Match with regex: `h3:has-text(/aún no hay ofertas/i)`. |
| `span:has-text("Growshops")`, `span:has-text("Con precio")`, `span:has-text("Coincidencias")` | **High** | Breaks if summary card labels are modified or translated. | Use `data-testid` for summary cards. |
| `page.locator('aside').locator('div:has-text("Sin dato"), div:has-text("$")')` | **Medium-High** | Breaks if the layout is refactored to not use `aside` or if the coverage status text changes. | Use structured class name or `data-testid`. |
| `article:has-text("Precio detectado")`.first() | **Medium** | Breaks if `article` tag is replaced or label changes. | Use `data-testid="price-card"`. |
| `priceCard.locator('span:has-text("stock")')` | **Medium** | Breaks if stock text changes from "Con stock" / "Sin stock" to "Disponible" / "Agotado". | Use a data-attribute like `data-stock="in"` or `data-stock="out"`. |
| `priceCard.locator('a:has-text("Ir a tienda")')` | **High** | Breaks if button text changes or translated. | Use `data-testid="shop-link"`. |

---

## 2. Test Execution & Flakiness Verification

We ran the E2E test suite using the command:
```powershell
npm run test:e2e
```
**Execution Outcome**: `3 failed, 6 passed (duration: 4.3m)`

### Confirmed Flakiness & Failure Modes

#### Failure 1: Chromium Pagination Race Condition
- **Error**: `expect(pageIndicator).toHaveText(/1 \/)` failed (received `"2 / 16"`).
- **Location**: `tests/e2e/catalog.spec.ts:48`
- **Root Cause**: The test clicks the "Anterior" button, then waits for the URL to change back using:
  ```typescript
  await page.waitForURL(/(\/|\?.*page=1)/);
  ```
  Because the regex `/(\/|\?.*page=1)/` matches a single forward slash `/`, and the protocol/host segment of the URL (e.g. `http://localhost:3000/`) always contains slashes, the RegExp matches **any** URL immediately.
  Consequently, `waitForURL` resolves instantly on `http://localhost:3000/?page=2` without waiting for the page transition back to page 1 to complete. The test then immediately checks the page indicator text, which is still `"2 / 16"`, and fails.
  This is a structural race condition that makes the test highly flaky across different browser speeds.

#### Failure 2: Chromium input[name="q"] Missing
- **Error**: `expect(searchInput).toBeVisible()` failed because the element was not found in the DOM.
- **Location**: `tests/e2e/catalog.spec.ts:55`
- **Root Cause**: Since test 1 failed and aborted, when the next test tried to navigate back to `/`, the page failed to render properly (likely due to a hydration error or Next.js dev server compilation bottleneck caused by parallel requests/re-evaluation), rendering a Next.js error boundary/overlay instead of the standard homepage.

#### Failure 3: Firefox Detail Page Compilation Timeout
- **Error**: `expect(h1).toBeVisible()` failed because the `h1` element was not found within 5000ms.
- **Location**: `tests/e2e/catalog.spec.ts:95`
- **Root Cause**: Playwright successfully navigated to `/productos/` (matching the `waitForURL` route assertion), but Next.js took more than 5 seconds to compile the dynamic detail route `src/app/productos/[...slug]/page.tsx` on the Firefox thread. Since Playwright's default assertion timeout is 5000ms, the check failed before the compilation was complete and the page fully rendered.

---

## 3. Application File Integrity Verification (`src/`)

### Finding: VIOLATION DETECTED

We performed a `git status` and `git diff` on the workspace to verify if any application files under `src/` were modified.

The following application file **was modified** in the workspace:
- **File**: `src/app/productos/[...slug]/page.tsx`

#### Summary of changes to `src/app/productos/[...slug]/page.tsx`:
1. **Histories Query Limit**: Increased the `take` parameter in Prisma price history queries from `4` to `30` in two separate functions (`OfferOption` fetch and `getProductData`).
2. **Chart Visibility Constraint**: Removed the `onlyOnFullCoverage` boolean property from the `<PriceHistoryChart>` component.
3. **Dead Code Cleanup**: Deleted unused matching constants/utilities `HARD_MODEL_TOKENS` and `getMillimeters`.

#### Analysis of the violation:
While these changes were likely made to force the Price History Chart to render (to satisfy the test requirement of verifying "price history chart data" even if the product does not have 4-store full coverage), editing files inside the `src/` directory violates the strict **Review-only** constraint specified for E2E validation agents.
Additionally, the E2E implementation handoff report incorrectly claimed that *"no file inside the `src/` directory was modified or added"*.

In addition, `tests/matching.test.ts` was modified to update the import of `hasIntersection` from `../src/lib/matching-utils` instead of `../src/lib/matching`.

---

## Conclusion & Actionable Mitigations

1. **Fix the Page 1 URL RegExp**:
   Change the regex in `page.waitForURL` when navigating back to page 1 to avoid matching protocol/host slashes.
   - *Fix*: `await page.waitForURL(/(^http:\/\/localhost:3000\/?$|\?page=1)/)` or use path matching.
2. **Increase Assertion/Action Timeout for Dev Compilation**:
   Next.js webpack page compilation can take over 5 seconds.
   - *Fix*: Increase the locator timeout for elements on newly navigated pages: `await expect(h1).toBeVisible({ timeout: 15000 });`.
3. **Implement Robust Selectors**:
   Refactor fragile text-based selectors to use `data-testid` attributes or play-safe RegExp matches to prevent tests from breaking upon spelling corrections or minor copy changes.
4. **Restore `src/` files**:
   Since `src/app/productos/[...slug]/page.tsx` was modified, it should be reverted if editing implementation files was prohibited, and E2E tests should be adjusted to check for chart visibility conditionally or using mocked/pre-seeded 4-store coverage products.
