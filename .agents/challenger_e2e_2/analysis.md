# E2E Test Suite Adversarial Analysis

## 1. Executive Summary

- **Overall Status**: **FLAKY / FRAGILE**
- **Selector Robustness**: **LOW**. The testing suite relies heavily on text-based matching in Spanish, strict HTML tag selectors, and fragile DOM structures, making it prone to breakage under styling/theme adjustments, copy changes, or translation.
- **Flakiness & Browser Consistency**: **HIGHLY FLAKY**. The test suite passed successfully on some standalone runs but failed on the full sequential run across Chromium and WebKit.
- **Application Files Modified**: **FAILED VERIFICATION**. The production file `src/app/productos/[...slug]/page.tsx` was modified. This represents a change in the application codebase rather than being restricted purely to testing code.

---

## 2. Selector Robustness Review

An adversarial analysis of `tests/e2e/catalog.spec.ts` reveals several critical vulnerabilities in its selectors. Below is a detailed breakdown:

| Selector | Line | Vulnerability / Failure Scenario | Risk Level | Recommended Mitigation |
|---|---|---|---|---|
| `page.locator('h2:has-text("Comparaciones encontradas")')` | 11 | Relies on the exact text string in Spanish. Will break if the heading is translated or reworded. Relies on the element being an `h2`. | **Medium** | Use `data-testid="catalog-heading"` or query by role: `page.getByRole('heading', { name: /comparaciones/i })`. |
| `page.locator('a:text("Comparar")')` | 14, 76, 84 | Relies on exact text `"Comparar"`. If localized (e.g., "Compare") or styling changes to an icon, it breaks. | **Medium** | Use `data-testid="compare-link"`. |
| `page.locator('span').filter({ hasText: /^\s*\d+\s*\/\s*\d+\s*$/ }).first()` | 25, 62 | **Extremely Brittle**. Scans all `<span>` tags for digits separated by a slash (e.g., `"2 / 16"`). If any other span contains a similar format (e.g., store coverage `"4/4"`, fractions, or dimensions), this can select the wrong element. | **Critical** | Add `data-testid="pagination-indicator"` to the indicator element. |
| `page.locator('a:has-text("Siguiente")')` / `"Anterior"` | 31, 42 | Relies on exact Spanish text. Breaks if pagination is replaced with icons (e.g., `>` / `<`), arrows, or translated. | **Medium** | Add `data-testid="pagination-next"` and `data-testid="pagination-prev"`. |
| `page.locator('h3:has-text("Aun no hay ofertas asociadas")')` | 65 | Relies on exact Spanish string and `h3` element wrapper. Breaks on spelling fixes (missing accent in "Aun") or copy changes. | **Low** | Use `data-testid="empty-state-message"`. |
| `page.locator('h1')` | 94 | Relies on there being a single/first `<h1>` for the product title. Breaks if the layout introduces another `<h1>` (e.g., in a header logo wrapper). | **Medium** | Use `data-testid="product-title"`. |
| `page.locator('span:has-text("Growshops")')` / `"Con precio"` / `"Coincidencias"` | 100-102 | Relies on exact Spanish text inside `span` tags. | **Medium** | Use data attributes like `data-testid="stat-growshops"`. |
| `page.locator('h2:has-text("Cobertura por growshop")')` | 105 | Relies on exact heading text. | **Low** | Use `data-testid="coverage-heading"`. |
| `page.locator('aside').locator('div:has-text("Sin dato"), div:has-text("$")')` | 106 | Relies on the element being inside an `<aside>` tag and containing exact text `"Sin dato"` or `"$"` inside a `div`. | **High** | Add a class or `data-testid` to the status row cell. |
| `page.locator('article:has-text("Precio detectado")').first()` | 110 | Relies on the card being an `<article>` tag and containing the phrase `"Precio detectado"`. | **Medium** | Use `data-testid="price-card"`. |
| `priceCard.locator('span:has-text("stock")')` | 114 | Case-insensitive matching for "stock". Breaks if the stock badge layout changes to icons or translated text. | **Medium** | Use `data-testid="stock-badge"`. |
| `priceCard.locator('a:has-text("Ir a tienda")')` | 118 | Relies on exact Spanish text. | **Medium** | Use `data-testid="outbound-link"`. |
| `page.locator('h3:has-text("Evolución de precios")')` | 125 | Relies on exact text and `h3` structure. | **Low** | Use test IDs. |
| `page.locator('h2:has-text("Otras comparaciones")')` | 129 | Relies on exact text and `h2` structure. | **Low** | Use test IDs. |
| `page.locator('section:has-text("Sigue comparando") a').first()` | 131 | Relies on the section containing `"Sigue comparando"` and navigates to the first anchor inside it. | **High** | Use `data-testid="related-product-link"`. |

---

## 3. Flakiness & Execution Analysis

During empirical testing (`npm run test:e2e`), two test failures were observed in a full sequential run, whereas subsequent isolated runs passed. This indicates race conditions and environment sensitivity.

### Failure 1: WebKit Pagination Race Condition
- **Verbatim Error**:
  ```
  Error: expect(locator).toHaveText(expected) failed
  Locator: locator('span').filter({ hasText: /^\s*\d+\s*\/\s*\d+\s*$/ }).first()
  Expected pattern: /1 \//
  Received string:  "2 / 16"
  ```
- **Root Cause**: The test checks pagination navigation:
  1. Navigates from Page 1 to Page 2, confirming indicator goes to `2 / 16`.
  2. Clicks the "Anterior" button to return to Page 1.
  3. Waits for navigation using: `await page.waitForURL(/(\/|\?.*page=1)/);`
  4. Immediately asserts that the page indicator text contains `1 /`.
  
  The regex `/(\/|\?.*page=1)/` matches **any** URL containing a slash `/`. Since the base URL is `http://localhost:3000/?page=2`, it contains multiple slashes. Therefore, `page.waitForURL` returns **instantly** without waiting for the actual navigation to Page 1. The assertion `toHaveText(/1 \//)` is executed while the page is still Page 2, leading to a timeout/failure. In some runs, WebKit loads Page 1 so fast that the page indicator updates before the assertion runs, masking this bug (flakiness).
- **Mitigation**: Update the URL match to be precise and avoid matching the scheme or domain slashes:
  `await page.waitForURL(url => url.pathname === '/' && (!url.searchParams.has('page') || url.searchParams.get('page') === '1'));`

### Failure 2: Chromium Search Timeout
- **Verbatim Error**:
  ```
  Error: page.waitForURL: Test timeout of 60000ms exceeded.
    73 |     // Wait for URL to reflect new search query
  > 74 |     await page.waitForURL(/\?.*q=raw/);
  ```
- **Root Cause**: The test executes two search queries sequentially. The first search query (`nonexistentproductxyz123`) loads quickly. The second query (`raw`) fills the input and presses Enter. Because Next.js dev server is running on demand (`npm run dev`), the query `q=raw` causes Next.js to trigger compiling or re-compiling components and routing handlers. Under system load, this compilation takes longer than Playwright's default timeouts, leading to a test timeout.
- **Mitigation**: Increase timeout in `playwright.config.ts` or pre-build the Next.js application (`npm run build && npm run start`) rather than running tests against the dev server (`npm run dev`).

---

## 4. Application Files Modifications (`src/`)

Verification of the codebase status using `git status` and `git diff` showed that one production file inside `src/` was modified:

### Modified File: `src/app/productos/[...slug]/page.tsx`
The following changes were introduced into the application logic:
1. **Price History Limit Increased**: Changed the number of price history records fetched from the database from `4` to `30` in two queries:
   - Line 83: `take: 4` -> `take: 30`
   - Line 341: `take: 4` -> `take: 30`
2. **Chart Visibility Rule Removed**: Removed the `onlyOnFullCoverage` boolean property from the `<PriceHistoryChart>` component call on Line 264.
3. **Helper Functions & Constants Cleaned**: Removed the `HARD_MODEL_TOKENS` constant and the `getMillimeters` helper function.

### Verification Statement
The modification of `src/app/productos/[...slug]/page.tsx` is an application change. It directly modifies page query logic and display behavior rather than being restricted to the E2E test files (`tests/e2e/`) and environment configurations.
