# soloWeed E2E Testing Strategy and Implementation Plan

This report outlines the proposed strategy, architecture, and exact file templates for implementing Playwright E2E testing in the soloWeed application.

---

## 1. Executive Summary
We propose a complete End-to-End (E2E) testing suite using **Playwright** to validate the key user flows of soloWeed (catalog browsing, search filtering, pagination, and multi-store price comparisons). The plan integrates seamlessly with the existing Next.js (App Router, Webpack-configured) setup and Prisma SQLite database, operating in a read-only manner during test execution.

---

## 2. Playwright Infrastructure Setup

### A. Packages to Install
To configure Playwright, the following NPM command should be run:
```bash
npm install -D @playwright/test
npx playwright install --with-deps
```
This installs the Playwright Test runner and fetches the required browser binaries (Chromium, Firefox, WebKit) alongside their system-level dependencies.

### B. Changes to `package.json`
We will introduce standard scripts to `package.json` to install browser binaries, run the tests in headless mode, run tests in UI mode, and debug them.

**Proposed diff for `package.json`:**
```json
  "scripts": {
    "dev": "next dev --webpack",
    "build": "next build --webpack",
    "start": "next start",
    "lint": "eslint",
    "test": "tsx --test tests/password.test.ts tests/export-catalog-audit.test.ts tests/matching.test.ts tests/catalog.test.ts",
+   "test:e2e": "playwright test",
+   "test:e2e:ui": "playwright test --ui",
+   "test:e2e:debug": "playwright test --debug",
+   "test:e2e:install": "playwright install --with-deps",
    "scrape": "tsx scripts/scrape.ts",
    ...
  }
```

### C. Contents of `playwright.config.ts`
The configuration file should be written at the root of the project (`E:\soloWeed\playwright.config.ts`). It handles parallel execution, retries, reporting, and spins up the local Next.js server dynamically.

```typescript
import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E Test Runner Configuration for soloWeed
 */
export default defineConfig({
  testDir: "./tests/e2e",
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [["html", { open: "never" }]],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: "http://localhost:3000",

    /* Collect trace when retrying a failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],

  /* Run local dev server before starting the tests */
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
```

---

## 3. Test Structure: `tests/e2e/catalog.spec.ts`

The proposed E2E test file will be situated in `tests/e2e/catalog.spec.ts`. It leverages Playwright's native assertion engine (`expect`) to assert elements on the homepage and the dynamic comparison page.

```typescript
import { test, expect } from "@playwright/test";

test.describe("soloWeed Catalog E2E Flow", () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the homepage before each test
    await page.goto("/");
  });

  /**
   * Scenario 1: Catalog loading and checking for comparable offers
   */
  test("should load the catalog and check for comparable products", async ({ page }) => {
    // Assert page title contains main branding keyword
    await expect(page).toHaveTitle(/SoloWeed/i);

    // Verify main header and subtitle are visible
    const header = page.locator("header");
    await expect(header).toBeVisible();
    await expect(page.locator("text=Compara parafernalia")).toBeVisible();

    // Verify database coverage panels are visible (Total, 3 stores, 2 stores)
    await expect(page.locator("text=Cobertura Total")).toBeVisible();
    await expect(page.locator("text=En 3 Tiendas")).toBeVisible();
    await expect(page.locator("text=En 2 Tiendas")).toBeVisible();

    // Confirm that the offers grid rendered at least one comparable item card
    const offerCards = page.locator("article");
    await expect(offerCards.first()).toBeVisible();
    
    // Check that there is at least one offer with a "Comparar" link
    const compareLink = page.locator('a:has-text("Comparar")').first();
    await expect(compareLink).toBeVisible();

    // Assert that the href follows the slug convention: /productos/<brandKey>/<modelSlug>
    const href = await compareLink.getAttribute("href");
    expect(href).toMatch(/^\/productos\/[a-z0-9-]+\/[a-z0-9-]+/);
  });

  /**
   * Scenario 2: Performing a search using the search form
   */
  test("should perform a search and show matching offers or an empty state", async ({ page }) => {
    const searchInput = page.locator('input[name="q"]');
    await expect(searchInput).toBeVisible();

    // Perform a search for a common brand ("RAW")
    const query = "RAW";
    await searchInput.fill(query);
    
    // Click on "Buscar ofertas"
    const searchButton = page.locator('button:has-text("Buscar ofertas")');
    await searchButton.click();

    // Assert URL contains the search parameters
    await page.waitForURL(new RegExp(`\\?.*q=${query}`));

    // Inspect results
    const offerCards = page.locator("article");
    const count = await offerCards.count();

    if (count > 0) {
      // The first result's title should contain "raw" (case-insensitive match)
      const firstTitle = await offerCards.first().locator("h3").textContent();
      expect(firstTitle?.toLowerCase()).toContain(query.toLowerCase());
    } else {
      // If no offers found, confirm Empty State component is visible
      await expect(page.locator("text=No se encontraron ofertas")).toBeVisible();
    }
  });

  /**
   * Scenario 3: Paginating the results
   */
  test("should support paginating catalog results", async ({ page }) => {
    const nextButton = page.locator('a:has-text("Siguiente")');

    // Pagination controls only exist if there is more than 1 page
    if (await nextButton.isVisible()) {
      // Locate page indicator span showing current/total pages (e.g., "1 / X")
      const pageCounter = page.locator("span.font-mono:has-text('/')");
      await expect(pageCounter).toBeVisible();
      await expect(pageCounter).toHaveText(/1\s*\/\s*\d+/);

      // Navigate to the next page
      await nextButton.click();
      await page.waitForURL(/.*page=2.*/);
      await expect(pageCounter).toHaveText(/2\s*\/\s*\d+/);

      // Navigate back to the first page
      const prevButton = page.locator('a:has-text("Anterior")');
      await expect(prevButton).toBeVisible();
      await prevButton.click();

      // Assert URL updates and we return to page 1
      await page.waitForURL(url => !url.searchParams.has("page") || url.searchParams.get("page") === "1");
      await expect(pageCounter).toHaveText(/1\s*\/\s*\d+/);
    } else {
      console.log("Pagination skipped: Not enough catalog items to create multiple pages.");
    }
  });

  /**
   * Scenario 4: Navigating to a product detail page and checking detail elements
   */
  test("should navigate to product detail page and verify price comparison elements", async ({ page }) => {
    // Select the first comparable offer and click "Comparar"
    const compareLink = page.locator('a:has-text("Comparar")').first();
    await expect(compareLink).toBeVisible();

    const targetUrl = await compareLink.getAttribute("href");
    expect(targetUrl).not.toBeNull();

    // Click link and wait for navigation
    await compareLink.click();
    await page.waitForURL(`**${targetUrl}`);

    // A. Check heading displays the product name
    const heading = page.locator("h1");
    await expect(heading).toBeVisible();
    expect(await heading.textContent()).not.toBeNull();

    // B. Check Summary Cards (Growshops, Con precio, Coincidencias) are present
    await expect(page.locator("text=Growshops")).toBeVisible();
    await expect(page.locator("text=Con precio")).toBeVisible();
    await expect(page.locator("text=Coincidencias")).toBeVisible();

    // C. Check Store Status Rows in the Sidebar
    const statusHeader = page.locator('h2:has-text("Cobertura por growshop")');
    await expect(statusHeader).toBeVisible();
    
    // Status rows contain store metadata and price or 'Sin dato'
    const statusRows = page.locator('aside >> div.flex:has-text("Astro Growshop"), aside >> div.flex:has-text("Fumetas"), aside >> div.flex:has-text("Piranha"), aside >> div.flex:has-text("GrowBarato Chile")');
    await expect(statusRows.first()).toBeVisible();

    // D. Check Price Comparison Cards grid
    const comparisonGridHeader = page.locator('h2:has-text("Visual de precios por tienda")');
    await expect(comparisonGridHeader).toBeVisible();

    const priceCards = page.locator("article:has-text('Precio detectado')");
    await expect(priceCards.first()).toBeVisible();

    // Confirm that the cards contain a stock indicator and a direct shop link
    const stockIndicator = priceCards.first().locator("text=Con stock, text=Sin stock");
    await expect(stockIndicator.first()).toBeVisible();

    const ctaButton = priceCards.first().locator('a:has-text("Ir a tienda")');
    await expect(ctaButton).toBeVisible();

    // E. Verify price history chart exists
    const historyHeader = page.locator('h3:has-text("Evolución de precios")');
    await expect(historyHeader).toBeVisible();

    // F. Verify related products list is visible
    const relatedHeader = page.locator('h2:has-text("Otras comparaciones de")');
    await expect(relatedHeader).toBeVisible();
    
    // Check that related products list renders product cards linking to other routes
    const relatedLinks = page.locator('section:has-text("Otras comparaciones de") >> a');
    await expect(relatedLinks.first()).toBeVisible();
    const relatedHref = await relatedLinks.first().getAttribute("href");
    expect(relatedHref).toMatch(/^\/productos\/[a-z0-9-]+\/[a-z0-9-]+/);
  });
});
```

---

## 4. Test Environment Strategy
- **SQLite Database**: The application dynamically reads data from the file configured in the `DATABASE_URL` environment variable. To guarantee repeatable tests, we recommend using a static SQLite database copy during E2E runs (e.g. `DATABASE_URL="file:./prisma/dev_recovered.db"` or a specific seed database) and setting it to read-only.
- **Port Conflict Mitigation**: The default port configuration is set to `http://localhost:3000`. Running Playwright automatically runs the webServer on this port. If this port is occupied, Playwright will attempt to reuse the existing server or fail if the existing server behaves differently. The config includes `reuseExistingServer: !process.env.CI` to facilitate smooth developer debugging without restarting the Next.js process.
- **Dynamic Port Scaling**: For CI environments, the port can be parameterized using the `PORT` env var (e.g., `PORT=3001` with `baseURL: http://localhost:3001`).
