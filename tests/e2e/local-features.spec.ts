import { expect, test, type Page } from "@playwright/test";

test.describe("SoloWeed local features", () => {
  test("selects a search suggestion with the keyboard", async ({ page }) => {
    await gotoStable(page, "/");
    const search = page.getByRole("combobox", { name: "Buscar productos" });
    await expect(search).toBeEditable();
    const suggestionsResponse = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname === "/api/suggestions" && url.searchParams.get("q") === "raw";
    });
    // This test covers keyboard interaction, so enter the query through real
    // key events and wait for the request that drives the listbox.
    await search.pressSequentially("raw", { delay: 50 });
    const response = await suggestionsResponse;
    expect(response.ok()).toBe(true);
    await search.focus();
    await expect(page.getByRole("option").filter({ hasText: "RAW Classic King Size Slim" })).toBeVisible({ timeout: 15000 });

    await search.press("ArrowDown");
    await expect(search).toHaveAttribute("aria-activedescendant", /option-0$/);
    await search.press("Enter");

    await expect(page).toHaveURL(/\/productos\/raw\/classic-king-size-slim/, { timeout: 30000 });
    await expect(page.getByRole("heading", { name: "RAW Classic King Size Slim", exact: true })).toBeVisible();
  });

  test("hydrates the product detail without React mismatch errors", async ({ page }) => {
    const hydrationErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error" && /Hydration failed|Minified React error #418/i.test(message.text())) {
        hydrationErrors.push(message.text());
      }
    });

    await gotoStable(page, "/productos/raw/classic-king-size-slim");
    await expect(page.getByRole("heading", { name: "RAW Classic King Size Slim", exact: true })).toBeVisible();
    expect(hydrationErrors).toEqual([]);
  });

  test("persists favorites and basket entries across reloads", async ({ page }, testInfo) => {
    test.setTimeout(120000);
    await gotoStable(page, "/");
    await expect(page.getByRole("heading", { name: "Comparaciones encontradas" })).toBeVisible();

    const saveFavorite = page.getByRole("button", { name: /^Guardar .+ en Mi lista$/ }).first();
    const addBasket = page.getByRole("button", { name: /^Agregar .+ a la canasta$/ }).first();
    await saveFavorite.click();
    await addBasket.click();

    if (testInfo.project.name === "mobile-chromium") {
      await expect(page.getByRole("link", { name: "Lista: 1" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Canasta: 1" })).toBeVisible();
    }

    await page.reload();
    await expect(page.getByRole("button", { name: /^Quitar .+ de Mi lista$/ }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /^Quitar .+ de la canasta$/ }).first()).toBeVisible();

    await gotoStable(page, "/lista");
    await expect(page.getByText("1 de 50 productos guardados en este navegador.")).toBeVisible();
    await page.reload();
    const removeFavorite = page.getByRole("button", { name: /^Quitar .+ de Mi lista$/ }).first();
    await expect(removeFavorite).toBeVisible();
    await removeFavorite.click();
    await expect(page.getByRole("heading", { name: "Tu lista está vacía" })).toBeVisible();

    await gotoStable(page, "/canasta");
    await expect(page.getByText("1 de 20 productos seleccionados")).toBeVisible();
    await page.reload();
    await expect(page.getByText("1 de 20 productos seleccionados")).toBeVisible();
  });

  test("previews a shared basket and merges quantities only after confirmation", async ({ page }) => {
    await page.route("**/api/canasta*", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          products: [{
            id: 123,
            name: "Producto compartido",
            href: "/productos/raw/producto-compartido",
            category: "Papelillos",
            brand: "RAW",
            imageUrl: null,
            offers: [{
              id: 1231,
              productId: 123,
              storeId: 1,
              storeName: "Tienda 1",
              storeSlug: "tienda-1",
              price: 1000,
              inStock: true,
              lastSeenAt: "2026-08-25T12:00:00.000Z",
              url: "https://example.com/1231",
            }],
          }],
          missingIds: [],
        }),
      });
    });
    await page.addInitScript(() => {
      window.localStorage.setItem("soloweed:basket:v1", JSON.stringify([{
        id: 123,
        title: "Producto compartido",
        href: "/productos/raw/producto-compartido",
        price: 1000,
        category: "Papelillos",
        brand: "RAW",
        storeCount: 1,
        imageUrl: null,
        addedAt: "2026-08-25T12:00:00.000Z",
        quantity: 2,
      }]));
    });

    await gotoStable(page, "/canasta#v=1&i=123:2&s=tienda-1:500:5000");
    await expect(page.getByRole("heading", { name: "Vista previa de canasta compartida" })).toBeVisible();
    await expect(page.getByText("No cambia tu canasta local hasta que elijas una acción.")).toBeVisible();
    await page.getByRole("button", { name: "Mezclar con local" }).click();
    await expect(page.getByText("Canasta compartida mezclada con la local.")).toBeVisible();
    await expect(page.getByRole("spinbutton", { name: "Cantidad de Producto compartido" })).toHaveValue("4");
  });

  test("creates, persists and edits a local price alert", async ({ page }, testInfo) => {
    await gotoStable(page, "/productos/raw/classic-king-size-slim");
    await expect(page.getByRole("heading", { name: "RAW Classic King Size Slim", exact: true })).toBeVisible();

    await page.getByRole("button", { name: /Crear alerta de precio/ }).click();
    const createDialog = page.getByRole("dialog", { name: /Configurar alerta/ });
    await createDialog.getByRole("spinbutton", { name: "Precio objetivo" }).fill("900");
    await createDialog.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Alerta guardada en este navegador.")).toBeVisible();

    if (testInfo.project.name === "mobile-chromium") {
      await expect(page.getByRole("link", { name: "Alertas: 1" })).toBeVisible();
    }

    await gotoStable(page, "/alertas");
    await expect(page.getByText("1 de 50 alertas locales")).toBeVisible();
    await page.reload();
    await expect(page.getByRole("link", { name: "RAW Classic King Size Slim" })).toBeVisible();

    await page.getByRole("button", { name: "Editar objetivo" }).click();
    const editForm = page.getByText("Nuevo precio objetivo").locator("..");
    await editForm.getByRole("spinbutton").fill("950");
    await editForm.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Precio objetivo actualizado.")).toBeVisible();
    await expect(page.getByText(/950/).first()).toBeVisible();
  });

  test("previews a shared list and imports it only after confirmation", async ({ page }) => {
    await page.route("**/api/canasta*", async (route) => {
      const sharedId = new URL(route.request().url()).searchParams.get("ids") === "456" ? 456 : 123;
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          products: [{
            id: sharedId,
            name: sharedId === 456 ? "Producto alternativo" : "Producto compartido",
            href: `/productos/raw/${sharedId === 456 ? "producto-alternativo" : "producto-compartido"}`,
            category: "Papelillos",
            brand: "RAW",
            imageUrl: null,
            offers: [{
              id: sharedId * 10 + 1,
              productId: sharedId,
              storeId: 1,
              storeName: "Tienda 1",
              storeSlug: "tienda-1",
              price: 1000,
              inStock: true,
              lastSeenAt: "2026-08-25T12:00:00.000Z",
              url: "https://example.com/1231",
            }],
          }],
          missingIds: [],
        }),
      });
    });
    await page.addInitScript(() => {
      window.localStorage.setItem("soloweed:favorites:v1", JSON.stringify([{
        id: 999,
        title: "Favorito local",
        href: "/productos/raw/favorito-local",
        price: 1200,
        category: "Papelillos",
        brand: "RAW",
        storeCount: 1,
        imageUrl: null,
        savedAt: "2026-08-25T12:00:00.000Z",
      }]));
    });

    await gotoStable(page, "/lista#v=1&i=123");
    await expect(page.getByRole("heading", { name: "Vista previa de lista compartida", exact: true })).toBeVisible();
    await expect(page.getByText("No cambia tu lista local hasta que elijas una acción.")).toBeVisible();
    await expect(page.getByText("Favorito local")).toBeVisible();

    await page.evaluate(() => { window.location.hash = "v=1&i=456"; });
    await expect(page.getByText("Producto alternativo")).toBeVisible();
    await page.evaluate(() => { window.location.hash = "v=1&i=123"; });
    await expect(page.getByText("Producto compartido")).toBeVisible();

    await page.getByRole("button", { name: "Reemplazar local" }).click();
    await expect(page.getByText("Lista compartida cargada.")).toBeVisible();
    await expect(page.getByText("1 de 50 productos guardados en este navegador.")).toBeVisible();
    await expect(page.getByText("Producto compartido")).toBeVisible();
    await expect(page.getByText("Favorito local")).toHaveCount(0);
  });

  test("keeps public navigation out of private routes", async ({ page }) => {
    await gotoStable(page, "/interno/login");
    await expect(page.locator('nav[aria-label="Navegación móvil"]')).toHaveCount(0);

    await gotoStable(page, "/precios/token-inexistente");
    await expect(page.locator('nav[aria-label="Navegación móvil"]')).toHaveCount(0);
  });
});

async function gotoStable(page: Page, url: string) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: "commit" });
      // `commit` avoids dev-server HMR interruptions, but it can precede
      // React hydration. Give client event handlers a chance to mount before
      // the caller starts interacting with the page.
      await page.waitForLoadState("load").catch(() => undefined);
      await page.waitForTimeout(1500);
      return;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("Navigation to") || !message.includes("interrupted")) throw error;
      // Next dev can send a full reload while compiling an on-demand route.
      await page.waitForTimeout(1000);
    }
  }
  throw lastError;
}
