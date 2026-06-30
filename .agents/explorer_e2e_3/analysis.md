# soloWeed Playwright E2E Testing Strategy and Plan

This document details the testing strategy, Playwright configuration, package requirements, and the complete planned structure of E2E tests for soloWeed's catalog browsing, searching, pagination, and comparison details.

---

## 1. Playwright Setup

### Packages to Install
To enable Playwright in the Next.js workspace, we will add the core Playwright package as a development dependency.

Execute the following commands:
```bash
# Install Playwright Test suite
npm install -D @playwright/test

# Install browser binaries (Chromium, Firefox, WebKit)
npx playwright install
```

### Changes to `package.json`
We will add standard E2E testing scripts inside the `scripts` object of `package.json`:

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:report": "playwright show-report"
  }
}
```

### Root Configuration file: `playwright.config.ts`
The following configuration file will be placed in the project root:

```typescript
import { defineConfig, devices } from "@playwright/test";

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  /* Maximum time one test can run for. */
  timeout: 30000,
  expect: {
    /**
     * Maximum time expect() should wait for the condition to be met.
     */
    timeout: 5000,
  },
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: "html",
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.BASE_URL || "http://localhost:3000",

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
    
    /* Take screenshots on failure for easier diagnostic triage. */
    screenshot: "only-on-failure",
    
    /* Capture video on failure to trace interaction states. */
    video: "retain-on-failure",
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
    stdout: "ignore",
    stderr: "pipe",
    timeout: 120000,
  },
});
```

---

## 2. Test Architecture: `tests/e2e/catalog.spec.ts`

The test suite covers four main areas:
1. **Catalog Load**: Verification that the home page loads the header, stats, and lists offer cards.
2. **Search functionality**: User input submission in the search input and verifying URL and content reactivity.
3. **Pagination**: Verifying page changes, next/previous buttons, and updated results.
4. **Product Detail & Price Comparison**: Clicking "Comparar" on a card and verifying that it displays comparison cards, store coverage sidebar list, catalogue metadata, related items, and price history chart elements.

Here is the proposed implementation code for `tests/e2e/catalog.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";

test.describe("soloWeed Catalog E2E Tests", () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage before each test case
    await page.goto("/");
  });

  test("should load the catalog page and display comparable offers", async ({ page }) => {
    // 1. Verify Site Title in Header
    const brandTitle = page.locator("header").getByText("SoloWeed");
    await expect(brandTitle).toBeVisible();

    // 2. Verify Page Subtitle is loaded
    const subtitle = page.locator("header").getByText("Compara parafernalia");
    await expect(subtitle).toBeVisible();

    // 3. Verify statistics panel is visible (contains coverage metrics for total/3 stores/2 stores)
    const statsContainer = page.locator("section").filter({ hasText: "Cobertura Total" });
    await expect(statsContainer).toBeVisible();

    // 4. Verify that we have at least one offer card listed on the page
    const offerCards = page.locator("article.group");
    await expect(offerCards.first()).toBeVisible();

    // 5. Ensure offers have "Comparar" (for comparable products) or "Ir a tienda" CTA links
    const compareLink = page.locator('a:has-text("Comparar"), a:has-text("Ir a tienda")');
    await expect(compareLink.first()).toBeVisible();
  });

  test("should filter offers using the search input", async ({ page }) => {
    // 1. Find the search input
    const searchInput = page.locator('input[name="q"]');
    await expect(searchInput).toBeVisible();

    // 2. Perform search query for a common item brand or category (e.g. 'RAW')
    const query = "RAW";
    await searchInput.fill(query);
    
    // 3. Submit search using button
    const searchButton = page.locator('button:has-text("Buscar ofertas")');
    await searchButton.click();

    // 4. Verify the URL has updated with the query param
    await expect(page).toHaveURL(new RegExp(`q=${query}`));

    // 5. Verify the search input retains the query value
    await expect(searchInput).toHaveValue(query);

    // 6. Verify that we still see matching offer cards or an Empty State
    const offerCards = page.locator("article.group");
    const emptyState = page.locator("text=No encontramos ofertas");

    const hasOffers = await offerCards.count() > 0;
    if (hasOffers) {
      // Check that the first offer card title contains the searched term
      const firstCardTitle = await offerCards.first().locator("h3").textContent();
      expect(firstCardTitle?.toLowerCase()).toContain(query.toLowerCase());
    } else {
      await expect(emptyState).toBeVisible();
    }
  });

  test("should navigate through results pages using pagination controls", async ({ page }) => {
    // 1. Check if pagination exists (depends on having more than CATALOG_PAGE_LIMIT (40) offers)
    const nextPageButton = page.locator('a:has-text("Siguiente")');
    
    // If the next page button is available, execute pagination testing
    if (await nextPageButton.count() > 0 && await nextPageButton.isEnabled()) {
      // Get initial page layout text (expecting "1 / X")
      const pageIndicator = page.locator("span.font-mono").filter({ hasText: "/" });
      await expect(pageIndicator).toContainText("1 /");

      // Click next page
      await nextPageButton.click();

      // 2. Verify URL contains page parameter
      await expect(page).toHaveURL(/page=2/);

      // 3. Verify indicator updates to page 2
      await expect(pageIndicator).toContainText("2 /");

      // 4. Click previous page
      const prevPageButton = page.locator('a:has-text("Anterior")');
      await expect(prevPageButton).toBeVisible();
      await prevPageButton.click();

      // 5. Verify return to page 1
      await expect(pageIndicator).toContainText("1 /");
    } else {
      console.log("Not enough items to test pagination controls");
    }
  });

  test("should navigate to product detail page and display comparison data", async ({ page }) => {
    // 1. Find the first comparable card that contains a "Comparar" link
    const compareLink = page.locator('a:has-text("Comparar")').first();
    
    // Skip if there are no comparable products in the database
    if (await compareLink.count() === 0) {
      console.log("No comparable products found to test detail navigation");
      return;
    }

    // Get the destination product slug URL path to assert redirection
    const href = await compareLink.getAttribute("href");
    expect(href).not.toBeNull();

    // Click on "Comparar"
    await compareLink.click();

    // 2. Verify navigation to the product page path
    await expect(page).toHaveURL(new RegExp(href!));

    // 3. Verify product detail view heading is visible
    const productHeading = page.locator("h1");
    await expect(productHeading).toBeVisible();

    // 4. Verify summary cards under header (Growshops, Con precio, Coincidencias)
    const summaryCards = page.locator("section div:has-text('Growshops')");
    await expect(summaryCards.first()).toBeVisible();

    // 5. Verify "Cobertura por growshop" status rows exist in the sidebar
    const coverageSidebar = page.locator("aside").filter({ hasText: "Cobertura por growshop" });
    await expect(coverageSidebar).toBeVisible();
    
    const storeStatusRows = coverageSidebar.locator("div.flex.items-center.justify-between");
    await expect(storeStatusRows.first()).toBeVisible();

    // 6. Verify "Datos del catalogo" card exist in the sidebar
    const catalogDataSidebar = page.locator("aside").filter({ hasText: "Datos del catalogo" });
    await expect(catalogDataSidebar).toBeVisible();

    // 7. Verify that at least one Store Price comparison card is rendered
    const storePriceCards = page.locator("article:has(a:has-text('Ir a tienda')), article:has(a:has-text('Ver growshop'))");
    await expect(storePriceCards.first()).toBeVisible();

    // Check that at least one price card shows a price or "Sin dato"
    const firstPriceCard = storePriceCards.first();
    await expect(firstPriceCard.locator("p.text-2xl.font-black")).toBeVisible(); // Store Name
    await expect(firstPriceCard.locator("span.font-mono")).toBeVisible(); // Stock indicator or options count

    // 8. Verify the presence of the Price History Chart container
    const chartWrapper = page.locator(".recharts-responsive-container");
    // Depending on data volume or rendering speed, assert chart existence
    await expect(chartWrapper).toBeVisible();

    // 9. Verify Related Products section ("Sigue comparando") is rendered if present
    const relatedSection = page.locator("section").filter({ hasText: "Sigue comparando" });
    if (await relatedSection.count() > 0) {
      await expect(relatedSection).toBeVisible();
      const relatedCards = relatedSection.locator("a[href^='/productos/']");
      await expect(relatedCards.first()).toBeVisible();
    }

    // 10. Verify clicking back redirects to home catalog
    const backButton = page.locator('a:has-text("Volver")');
    await expect(backButton).toBeVisible();
    await backButton.click();
    await expect(page).toHaveURL(/\/$/);
  });
  
});
```
