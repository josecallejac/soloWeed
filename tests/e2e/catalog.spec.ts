import { test, expect } from '@playwright/test';

test.describe('soloWeed Catalog and Detail E2E Tests', () => {

  test('should load catalog, verify headers, verify href format, and test pagination', async ({ page }) => {
    // 1. Catalog loading and header verification
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Title and main heading verification
    await expect(page).toHaveTitle(/SoloWeed/i);
    await expect(page.locator('h2:has-text("Comparaciones encontradas")')).toBeVisible();

    // Existence of comparable products (at least one link with text "Comparar")
    const compararLink = page.locator('a:text("Comparar")').first();
    await expect(compararLink).toBeVisible();

    // 2. Checking the "Comparar" link href matches the dynamic slug format `/productos/<brandKey>/<modelSlug>`
    const href = await compararLink.getAttribute('href');
    expect(href).not.toBeNull();
    // Regex matches /productos/ followed by brandKey and modelSlug segments
    expect(href).toMatch(/^\/productos\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+(\/[a-zA-Z0-9_-]+)*$/);

    // 3. Paginating catalog results (Siguiente/Anterior navigation and page indicator updates)
    // Regex filter ensures we target only the "X / Y" page indicator, excluding coverage badges like "4/4"
    const pageIndicator = page.locator('span').filter({ hasText: /^\s*\d+\s*\/\s*\d+\s*$/ }).first();
    await expect(pageIndicator).toBeVisible();
    const initialText = await pageIndicator.innerText();
    expect(initialText).toContain('/');

    // Click Siguiente
    const siguienteBtn = page.locator('a:has-text("Siguiente")');
    await expect(siguienteBtn).toBeVisible();
    await siguienteBtn.click();

    // Wait for navigation and URL update
    await page.waitForURL(/\?.*page=2/);
    
    // Verify page indicator updates
    await expect(pageIndicator).toHaveText(/2 \//);

    // Click Anterior
    const anteriorBtn = page.locator('a:has-text("Anterior")');
    await expect(anteriorBtn).toBeVisible();
    await anteriorBtn.click();

    // Wait for navigation back to page 1
    await page.waitForURL((url) => {
      return url.pathname === '/' && (!url.searchParams.has('page') || url.searchParams.get('page') === '1');
    });
    await expect(pageIndicator).toHaveText(/1 \//);
  });

  test('should execute search queries and verify filtering and empty state', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('input[name="q"]');
    await expect(searchInput).toBeVisible();

    // Search for a nonexistent term to test empty state
    await searchInput.fill('nonexistentproductxyz123');
    await searchInput.press('Enter');

    // Wait for URL to reflect search query
    await page.waitForURL(/\?.*q=nonexistentproductxyz123/);

    // Verify empty state message
    const emptyStateHeader = page.locator('h3', { hasText: /a[úu]n no hay ofertas/i });
    await expect(emptyStateHeader).toBeVisible();

    // Search for a common term (like "raw" or "bong" or similar brand/product)
    await searchInput.fill('raw');
    await searchInput.press('Enter');

    // Wait for URL to reflect new search query
    await page.waitForURL(/\?.*q=raw/);

    // Verify search results are filtered and comparisons exist
    const firstMatch = page.locator('a:text("Comparar")').first();
    await expect(firstMatch).toBeVisible();
  });

  test('should filter catalog by brand from the sidebar', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // The brand sidebar renders when curated brands exist
    await expect(page.locator('h2:has-text("Marcas")')).toBeVisible();

    // Pick the first brand link (skipping the "Todas las marcas" reset entry)
    const brandLink = page.locator('h2:has-text("Marcas") + div a').nth(1);
    await expect(brandLink).toBeVisible();
    const brandName = (await brandLink.locator('span').first().innerText()).trim();
    await brandLink.click();

    // URL reflects the brand filter and results still render
    await page.waitForURL(/\?.*brand=/);
    await expect(page.locator('a:text("Comparar")').first()).toBeVisible();

    // The selected brand appears highlighted and clicking it again clears the filter
    const selectedBrand = page.locator('h2:has-text("Marcas") + div a', { hasText: brandName }).first();
    await selectedBrand.click();
    await page.waitForURL((url) => !url.searchParams.has('brand'));
  });

  test('should switch variants on a product detail page when available', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const compararLink = page.locator('a:text("Comparar")').first();
    await expect(compararLink).toBeVisible();
    await compararLink.click();
    await page.waitForURL(/\/productos\//);
    await expect(page.locator('h1')).toBeVisible({ timeout: 15000 });

    // The selector only renders for products with more than one variant
    const selector = page.locator('#variant-selector');
    if (await selector.count() === 0) {
      test.info().annotations.push({ type: 'note', description: 'Producto sin variantes; selector no renderizado.' });
      return;
    }

    const options = selector.locator('option');
    expect(await options.count()).toBeGreaterThan(1);
    const secondValue = await options.nth(1).getAttribute('value');
    await selector.selectOption(secondValue!);

    // Selecting a variant pushes ?v= to the URL without a full reload
    await page.waitForURL((url) => url.searchParams.get('v') === secondValue);
    await expect(selector).toHaveValue(secondValue!);
  });

  test('should navigate to product detail and verify dynamic elements', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for comparable offers to load
    const compararLink = page.locator('a:text("Comparar")').first();
    await expect(compararLink).toBeVisible();
    
    // Click "Comparar" to navigate
    await compararLink.click();

    // Wait for detail view loading
    await page.waitForURL(/\/productos\//);

    // h1 product name
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible({ timeout: 15000 });
    const h1Text = await h1.innerText();
    expect(h1Text.length).toBeGreaterThan(0);

    // Summary cards: 'Growshops', 'Con precio', 'Coincidencias'
    await expect(page.locator('span:has-text("Growshops")')).toBeVisible();
    await expect(page.locator('span:has-text("Con precio")')).toBeVisible();
    await expect(page.locator('span:has-text("Coincidencias")')).toBeVisible();

    // Store coverage table/status row in aside
    await expect(page.locator('h2:has-text("Cobertura por growshop")')).toBeVisible();
    const statusRow = page.locator('aside').locator('div:has-text("Sin dato"), div:has-text("$")');
    await expect(statusRow.first()).toBeVisible();

    // Store price cards with stock/shop link
    const priceCard = page.locator('article:has-text("Precio detectado")').first();
    await expect(priceCard).toBeVisible();
    
    // Stock badge: "Con stock" or "Sin stock"
    const stockBadge = priceCard.locator('span:has-text("stock")');
    await expect(stockBadge).toBeVisible();
    
    // Shop link: "Ir a tienda"
    const shopLink = priceCard.locator('a:has-text("Ir a tienda")');
    await expect(shopLink).toBeVisible();
    const shopHref = await shopLink.getAttribute('href');
    expect(shopHref).not.toBeNull();
    expect(shopHref?.startsWith('http')).toBe(true);

    // Price history chart (renders when chart data is present)
    const historyChartHeader = page.locator('h3:has-text("Evolución de precios")');
    if (await historyChartHeader.count() > 0) {
      await expect(historyChartHeader).toBeVisible();
    }

    // Related product links (renders when related products are present)
    const relatedSection = page.locator('h2:has-text("Otras comparaciones")');
    await expect(relatedSection).toBeVisible();
    const relatedLink = page.locator('section:has-text("Sigue comparando") a').first();
    await expect(relatedLink).toBeVisible();
    const relatedHref = await relatedLink.getAttribute('href');
    expect(relatedHref).toMatch(/^\/productos\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+(\/[a-zA-Z0-9_-]+)*$/);
  });
});
