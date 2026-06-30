# soloWeed E2E Testing Strategy and Implementation Plan

This document proposes the testing strategy, infrastructure setup, and test structure for soloWeed's End-to-End (E2E) test suite using Playwright.

---

## 1. Playwright Infrastructure Setup

To implement E2E testing in soloWeed, we will use **Playwright**. Since the project runs a TypeScript Next.js (App Router) web application, Playwright is the standard industry choice for testing modern frontend routes, dynamic search forms, and comparative product grids.

### A. Packages to Install
Run the following commands to add Playwright dependencies to the development environment and install the required browser binaries:

```bash
# Install the Playwright Test library as a devDependency
npm install -D @playwright/test

# Install Playwright's default browser binaries (Chromium, Firefox, WebKit) and OS dependencies
npx playwright install --with-deps
```

### B. Changes to `package.json`
We will add standard CLI shortcut scripts to the `"scripts"` object in `package.json` to facilitate running the tests in various modes:

```json
"scripts": {
  ...
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui",
  "test:e2e:debug": "playwright test --debug",
  "test:e2e:report": "playwright show-report"
}
```

- **`test:e2e`**: Runs the tests in headless mode (perfect for CI/CD pipelines).
- **`test:e2e:ui`**: Launches the Playwright Interactive UI Mode for debugging and visual tracing.
- **`test:e2e:debug`**: Opens the Playwright Inspector for step-by-step test execution.
- **`test:e2e:report`**: Opens the generated HTML test results report.

### C. Contents of `playwright.config.ts`
The configuration file will be placed in the project root (`E:\soloWeed\playwright.config.ts`). It configures tests to run against Next.js on port `3000` and sets up auto-booting of the web server during testing.

```typescript
import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E configuration for soloWeed.
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Take screenshots on failure for easier diagnostics */
    screenshot: 'only-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  /* Run local dev or production server before starting the tests.
   * On local dev, it reuses the active server if running on port 3000.
   * On CI, it runs the production build and starts it. */
  webServer: {
    command: process.env.CI ? 'npm run start' : 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

---

## 2. E2E Test Strategy & Targets

The web application contains a dynamic search-and-compare catalog that queries SQLite. E2E tests will target four core functional domains of `/` and `/productos/...` routes:

| User Action Flow | Target Element & Selector | Key Assertion / Verification |
|---|---|---|
| **Catalog Initial Load** | `SiteHeader`, `article.group` (offer card) | Confirm catalog items render. Verify at least one offer card has a "Comparar" link. |
| **Search Functionality** | `input[name="q"]`, `form button` | Enter search term, submit form, verify URL query string, confirm results match the search query. |
| **Catalog Pagination** | `Link` with text "Siguiente" or "Anterior", page indicator | Click navigation, assert URL parameter changes, verify the indicator updates (e.g. `2 / X`). |
| **Product Detail Navigation** | `a[href^="/productos/"]` with text "Comparar" | Clicking details redirects to `/productos/<brandKey>/<modelSlug>`. |
| **Product Detail Layout** | `h1`, sidebar rows (`StoreStatusRow`), cards (`StorePriceCard`) | Check product header, sidebar coverage rows (prices/Sin dato), price grid cards (store name, CTA to raw offer), related products panel. |

---

## 3. Plan for `tests/e2e/catalog.spec.ts`

The spec file will be written to `E:\soloWeed\tests\e2e\catalog.spec.ts`. Below is the complete planned code implementation for the test suite.

```typescript
import { test, expect } from '@playwright/test';

test.describe('Catalog and Product Details E2E Scenarios', () => {
  
  test('should load the homepage and check for comparable offers', async ({ page }) => {
    // 1. Navigate to the homepage
    await page.goto('/');

    // 2. Confirm the page subtitle "Compara parafernalia" is visible
    await expect(page.locator('text=Compara parafernalia')).toBeVisible();

    // 3. Confirm that the catalog has loaded at least some offers
    const offerCards = page.locator('article.group');
    await expect(offerCards.first()).toBeVisible();

    // 4. Find a comparable offer card (one that maps to a Product and matches >1 store)
    // This displays a "Comparar" button linking to comparison slug.
    const compareLink = page.getByRole('link', { name: 'Comparar' }).first();
    await expect(compareLink).toBeVisible();
    
    // 5. Check that the link conforms to the standard URL contract: /productos/<brandKey>/<modelSlug>
    const href = await compareLink.getAttribute('href');
    expect(href).toMatch(/^\/productos\/[^\/]+\/[^\/]+/);
  });

  test('should perform a search using the search form', async ({ page }) => {
    await page.goto('/');

    // 1. Locate and fill in the search input
    const searchInput = page.getByPlaceholder('Busca bongs, moledores, RAW, vaporizadores...');
    await expect(searchInput).toBeVisible();
    
    // We search for "RAW" as it is a widely available brand in the database
    await searchInput.fill('RAW');

    // 2. Click the 'Buscar ofertas' button to submit
    const searchButton = page.getByRole('button', { name: 'Buscar ofertas' });
    await searchButton.click();

    // 3. Confirm URL changes to include search query ?q=RAW
    await expect(page).toHaveURL(/\?q=RAW/);

    // 4. Confirm search results are returned and match query
    const offerCards = page.locator('article.group');
    await expect(offerCards.first()).toBeVisible();
    
    const firstOfferTitle = offerCards.first().locator('h3');
    await expect(firstOfferTitle).toContainText(/raw/i);
  });

  test('should paginate the catalog results', async ({ page }) => {
    await page.goto('/');

    // 1. Verify we start on Page 1 (look for "1 / X" pagination text)
    const firstPageIndicator = page.locator('text=/1 \\/ \\d+/');
    await expect(firstPageIndicator).toBeVisible();

    // 2. Verify "Siguiente" button is visible and click it
    const nextButton = page.getByRole('link', { name: 'Siguiente' });
    await expect(nextButton).toBeVisible();
    await nextButton.click();

    // 3. Verify URL updates to include page=2
    await expect(page).toHaveURL(/page=2/);

    // 4. Verify the pagination indicator updates to "2 / X"
    const secondPageIndicator = page.locator('text=/2 \\/ \\d+/');
    await expect(secondPageIndicator).toBeVisible();

    // 5. Verify "Anterior" button is now visible and click it to go back
    const prevButton = page.getByRole('link', { name: 'Anterior' });
    await expect(prevButton).toBeVisible();
    await prevButton.click();

    // 6. Verify we return to page 1
    await expect(page).toHaveURL(/page=1/);
    await expect(firstPageIndicator).toBeVisible();
  });

  test('should navigate to product detail page and check detail view elements', async ({ page }) => {
    await page.goto('/');

    // 1. Find a "Comparar" link and click it to go to product page
    const compareLink = page.getByRole('link', { name: 'Comparar' }).first();
    await expect(compareLink).toBeVisible();
    await compareLink.click();

    // 2. Wait for detail page load and assert product name heading is visible (h1)
    const productHeading = page.locator('h1');
    await expect(productHeading).toBeVisible();

    // 3. Check for summary stat cards in the product grid (Growshops, Con precio, Coincidencias)
    await expect(page.locator('text=Growshops')).toBeVisible();
    await expect(page.locator('text=Con precio')).toBeVisible();
    await expect(page.locator('text=Coincidencias')).toBeVisible();

    // 4. Verify sidebar panels are present
    await expect(page.getByRole('heading', { name: 'Cobertura por growshop' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Datos del catalogo' })).toBeVisible();

    // Verify that the store rows in the sidebar exist
    const storeStatusRows = page.locator('aside').first().locator('div.flex.items-center.justify-between');
    await expect(storeStatusRows.first()).toBeVisible();

    // 5. Verify the main comparison section
    await expect(page.getByRole('heading', { name: 'Visual de precios por tienda' })).toBeVisible();

    // Check store price cards list
    const storePriceCards = page.locator('article.relative.overflow-hidden');
    await expect(storePriceCards.first()).toBeVisible();
    
    // Each price card has an offer title, a price, and a direct CTA link
    const firstStoreCard = storePriceCards.first();
    await expect(firstStoreCard.locator('h3')).toBeVisible(); // offer title
    await expect(firstStoreCard.locator('text=Ir a tienda')).toBeVisible();

    // 6. Verify related products section ("Sigue comparando") if it exists
    const relatedSection = page.locator('text=Sigue comparando');
    if (await relatedSection.isVisible()) {
      await expect(page.locator('text=Otras comparaciones de')).toBeVisible();
      const relatedCards = page.locator('section.px-5.pb-14 a.group');
      await expect(relatedCards.first()).toBeVisible();
    }
  });
});
```

---

## 4. Verification and Execution Guidelines

Once the implementation phase begins, developers or implementing agents can run and verify the test execution using the following steps:

1. **Verify local server builds successfully**:
   ```bash
   npm run build
   ```
2. **Start the local server**:
   ```bash
   npm run dev
   ```
3. **Execute the E2E tests**:
   ```bash
   # Run all E2E tests headlessly
   npm run test:e2e
   
   # Or run specific scenarios using the Playwright interactive UI
   npm run test:e2e:ui
   ```
4. **Expected Output**:
   All 4 scenarios should pass successfully across Chromium, Firefox, and WebKit, and a final report HTML folder will be written to `playwright-report/`.
