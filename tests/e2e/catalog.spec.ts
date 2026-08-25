import { expect, test } from "@playwright/test";

test.describe("SoloWeed catalog", () => {
  test("keeps the catalog inside the viewport on mobile", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Comparaciones encontradas" })).toBeVisible();

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  });

  test("loads the catalog and continues with infinite scroll", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/SoloWeed/i);
    await expect(page.getByRole("heading", { name: "Comparaciones encontradas" })).toBeVisible();

    const compareLink = page.getByRole("link", { name: /Comparar/ }).first();
    await expect(compareLink).toBeVisible();
    await expect(compareLink).toHaveAttribute("href", /^\/productos\/[a-zA-Z0-9_-]+(\/[a-zA-Z0-9_-]+)+$/);

    const cards = page.locator("article");
    const initialCardCount = await cards.count();
    expect(initialCardCount).toBeGreaterThan(0);

    // The intersection observer may already have started the next request on
    // WebKit before the fallback button is clicked. Prefer the real observer
    // path, then use the accessible fallback only if it did not fire.
    const loadMore = page.getByRole("button", { name: "Cargar más" });
    await expect(loadMore).toBeVisible();
    await loadMore.scrollIntoViewIfNeeded();
    let loadedByObserver = false;
    try {
      await expect.poll(() => cards.count(), { timeout: 5000 }).toBeGreaterThan(initialCardCount);
      loadedByObserver = true;
    } catch {
      loadedByObserver = false;
    }
    if (!loadedByObserver) {
      const fallback = page.getByRole("button", { name: "Cargar más" });
      if (await fallback.count() > 0 && await fallback.isVisible()) {
        await fallback.click({ force: true });
      }
    }
    await expect.poll(() => cards.count(), { timeout: 30000 }).toBeGreaterThan(initialCardCount);
  });

  test("searches and shows an empty state for unknown terms", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Comparaciones encontradas" })).toBeVisible();

    const searchInput = page.locator('input[name="q"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill("nonexistentproductxyz123");
    await page.getByRole("button", { name: "Buscar ofertas" }).click();
    await expect(page).toHaveURL(/q=nonexistentproductxyz123/, { timeout: 30000 });
    await expect(page.getByRole("heading", { name: /Aun no hay ofertas para mostrar/i })).toBeVisible();

    await searchInput.fill("raw");
    await page.getByRole("button", { name: "Buscar ofertas" }).click();
    await expect(page).toHaveURL(/q=raw/, { timeout: 30000 });
    await expect(page.getByRole("link", { name: /Comparar/ }).first()).toBeVisible();
  });

  test("filters the catalog by brand within a category", async ({ page }, testInfo) => {
    await page.goto("/?category=Papelillos");

    if (testInfo.project.name === "mobile-chromium") {
      await page.evaluate(() => window.scrollTo(0, 240));
      await page.getByRole("button", { name: /Filtros/ }).click();
    }

    const brandsHeading = page.getByRole("heading", { name: "Marcas" });
    await expect(brandsHeading).toBeVisible();
    const brands = brandsHeading.locator("..").getByRole("link");
    await brands.nth(1).click();
    await expect(page).toHaveURL(/category=Papelillos.*brand=/);
    await expect(page.getByRole("link", { name: /Comparar/ }).first()).toBeVisible();

    await brands.first().click();
    await expect(page).toHaveURL(/category=Papelillos/);
  });

  test("opens product detail and uses the outbound tracking route", async ({ page }) => {
    await page.goto("/");

    const compareLink = page.getByRole("link", { name: /Comparar/ }).first();
    await expect(compareLink).toBeVisible();
    await compareLink.click();
    await expect(page).toHaveURL(/\/productos\//, { timeout: 30000 });

    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Cobertura por growshop" })).toBeVisible();
    await expect(page.getByText("Con precio", { exact: true })).toBeVisible();

    const shopLink = page.getByRole("link", { name: /IR A TIENDA/ }).first();
    await expect(shopLink).toBeVisible();
    await expect(shopLink).toHaveAttribute("href", /^\/ir\/\d+$/);

    await expect(page.getByRole("heading", { name: /Otras comparaciones en Papelillos/ })).toBeVisible();
  });

  test("switches product variants when the selector is available", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Comparar/ }).first().click();
    await expect(page.locator("h1")).toBeVisible();

    const selector = page.locator("#variant-selector");
    if (await selector.count() === 0) {
      test.info().annotations.push({ type: "note", description: "Producto sin selector de variantes." });
      return;
    }

    const secondValue = await selector.locator("option").nth(1).getAttribute("value");
    expect(secondValue).not.toBeNull();
    await selector.selectOption(secondValue!);
    await expect(page).toHaveURL(new RegExp(`[?&]v=${secondValue}`));
    await expect(selector).toHaveValue(secondValue!);
  });
});
