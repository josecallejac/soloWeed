import { expect, test, type Page } from "@playwright/test";
import { randomBytes, randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { withSafeE2eDatabase } from "../../scripts/lib/e2e-database";
import { hashToken } from "../../src/lib/password";

async function browserCookie(page: Page, baseURL: string, token: string) {
  await page.context().addCookies([{
    name: "soloweed_session", value: token, url: baseURL,
    httpOnly: true, secure: false, sameSite: "Lax", expires: Math.floor(Date.now() / 1000) + 3600,
  }]);
}

async function sessionFixture(page: Page, baseURL: string, expired: boolean, work: (db: PrismaClient, tokenHash: string) => Promise<void>) {
  await withSafeE2eDatabase(process.env, (url) => new PrismaClient({ datasources: { db: { url } } }), async (db) => {
    const token = randomBytes(32).toString("base64url");
    const tokenHash = hashToken(token);
    const user = await db.user.create({ data: { email: `qa-session-${randomUUID()}@example.test`, passwordHash: "qa-not-used-for-login", role: "ADMIN" } });
    try {
      await db.session.create({ data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + (expired ? -1 : 1) * 3_600_000) } });
      await browserCookie(page, baseURL, token);
      await work(db, tokenHash);
    } finally {
      await db.user.deleteMany({ where: { id: user.id } });
    }
  });
}

test.describe("Session rendering and logout on the compiled application", () => {
  test("renders login with an unknown cookie and preserves native keyboard navigation", async ({ page, baseURL }, testInfo) => {
    await browserCookie(page, baseURL!, "qa-unknown-session-token");
    const response = await page.goto("/interno/login");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Ingreso interno" })).toBeVisible();
    expect((await page.context().cookies()).find((cookie) => cookie.name === "soloweed_session")?.value).toBe("qa-unknown-session-token");
    const email = page.getByLabel("Email", { exact: true });
    const password = page.getByLabel("Password", { exact: true });
    await email.click();
    await page.keyboard.press("Tab");
    await expect(password).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(email).toBeFocused();
    const focus = await email.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom, height: innerHeight, uncovered: element.contains(document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)) };
    });
    expect(focus.top).toBeGreaterThanOrEqual(0);
    expect(focus.bottom).toBeLessThanOrEqual(focus.height);
    expect(focus.uncovered).toBe(true);
    await testInfo.attach("login-keyboard-qa", { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
    await page.goto("/interno/reportes");
    await expect(page).toHaveURL(/\/interno\/login$/);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Comparaciones encontradas" })).toBeVisible();
    await testInfo.attach("catalog-viewport-qa", { body: await page.screenshot(), contentType: "image/png" });
  });

  test("renders expired sessions without deleting a row or mutating the cookie", async ({ page, baseURL }) => {
    await sessionFixture(page, baseURL!, true, async (db, tokenHash) => {
      const response = await page.goto("/interno/login");
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { name: "Ingreso interno" })).toBeVisible();
      expect(await db.session.count({ where: { tokenHash } })).toBe(1);
      expect((await page.context().cookies()).some((cookie) => cookie.name === "soloweed_session")).toBe(true);
      await page.goto("/interno/reportes");
      await expect(page).toHaveURL(/\/interno\/login$/);
      expect(await db.session.count({ where: { tokenHash } })).toBe(1);
    });
  });

  test("accepts a valid admin session and revokes it through the logout Server Action", async ({ page, baseURL }) => {
    await sessionFixture(page, baseURL!, false, async (db, tokenHash) => {
      await page.goto("/interno/login");
      await expect(page).toHaveURL(/\/interno\/reportes$/);
      const logout = page.getByRole("button", { name: "Cerrar sesion", exact: true });
      await expect(logout).toBeVisible();
      await logout.click();
      await expect(page).toHaveURL(/\/interno\/login$/);
      await expect(page.getByRole("heading", { name: "Ingreso interno" })).toBeVisible();
      expect(await db.session.count({ where: { tokenHash } })).toBe(0);
      expect((await page.context().cookies()).some((cookie) => cookie.name === "soloweed_session")).toBe(false);
    });
  });
});
