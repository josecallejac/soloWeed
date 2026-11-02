import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { withSafeE2eDatabase } from "../../scripts/lib/e2e-database";

test("keeps malicious product JSON-LD inside its script without executing injected HTML", async ({ page }, testInfo) => {
  await withSafeE2eDatabase(process.env, (url) => new PrismaClient({ datasources: { db: { url } } }), async (db) => {
    const product = await db.product.findUniqueOrThrow({ where: { brandKey_modelSlug: { brandKey: "raw", modelSlug: "classic-king-size-slim" } }, include: { offers: true } });
    // Mutate only the known two-store seed fixture, never a verified/live group.
    expect(product.offers.length).toBe(2);
    for (const offer of product.offers) {
      expect(new URL(offer.url).hostname.endsWith(".example.test")).toBe(true);
      expect(offer.sourceId?.startsWith("e2e-0-")).toBe(true);
    }
    const payload = 'QA </script><script id="qa-jsonld-injected">document.documentElement.dataset.qaInjected="yes"</script>';
    try {
      await page.goto("/productos/raw/classic-king-size-slim");
      await expect(page.getByRole("heading", { name: product.name, exact: true })).toBeVisible();
      await expect(page.locator("html")).toHaveClass(/\bdark\b/);
      await testInfo.attach("product-dark-qa", { body: await page.screenshot(), contentType: "image/png" });
      await page.getByRole("button", { name: "Toggle theme", exact: true }).click();
      await expect(page.locator("html")).toHaveClass(/\blight\b/);
      await testInfo.attach("product-light-qa", { body: await page.screenshot(), contentType: "image/png" });
      await db.product.update({ where: { id: product.id }, data: { name: payload } });
      const response = await page.goto(`/productos/raw/classic-king-size-slim?qa_jsonld=${randomUUID()}`);
      expect(response?.status()).toBe(200);
      await expect(page.locator("#qa-jsonld-injected")).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.dataset.qaInjected ?? null)).toBeNull();
      const structuredData = page.locator('script[type="application/ld+json"]');
      await expect(structuredData).toHaveCount(1);
      expect(JSON.parse((await structuredData.textContent())!)).toMatchObject({ "@type": "Product", name: payload });
    } finally {
      await db.product.update({ where: { id: product.id }, data: { name: product.name, updatedAt: product.updatedAt } });
    }
  });
});
