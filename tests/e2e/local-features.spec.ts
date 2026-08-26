import { expect, test, type Page } from "@playwright/test";

test.describe("SoloWeed local features", () => {
  test("selects a search suggestion with the keyboard", async ({ page }) => {
    await gotoStable(page, "/");
    // Let the client hydrate before dispatching keyboard input. This avoids a
    // cold-start race that is especially visible in WebKit.
    await page.waitForTimeout(1000);
    const search = page.getByRole("combobox", { name: "Buscar productos" });
    await search.fill("raw");
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
