## 2026-06-30T12:33:55-04:00
You are worker_e2e_remediation. Your working directory is E:\soloWeed\.agents\worker_e2e_remediation.
Your task is to fix the E2E testing implementation and restore the codebase integrity.

An integrity violation occurred because the previous worker modified the application source code at `src/app/productos/[...slug]/page.tsx`. This violates the strict requirement that NO source files under `src/` may be changed.

Follow these steps exactly:
1. Revert the modifications to `src/app/productos/[...slug]/page.tsx` by running:
   `git checkout src/app/productos/[...slug]/page.tsx`
   (You can run this using a terminal command, as you have execution privileges).
   Verify via `git status` that the `src/` directory is completely clean and unmodified.

2. Refactor the E2E tests in `tests/e2e/catalog.spec.ts` to address the following failures and improve robustness:
   - **WebKit pagination failure**: Change the page 1 wait logic. Instead of:
     `await page.waitForURL(/(\/|\?.*page=1)/);`
     use:
     ```typescript
     await page.waitForURL((url) => {
       return url.pathname === '/' && (!url.searchParams.has('page') || url.searchParams.get('page') === '1');
     });
     ```
   - **Hydration / Compilation timeouts**: WebKit and Firefox can be slow to hydrate/compile pages.
     - Add `await page.waitForLoadState('networkidle');` or a small wait after navigating to `/`.
     - Increase the timeout for the H1 element assertion in the detail view to 15 seconds:
       `await expect(h1).toBeVisible({ timeout: 15000 });`
   - **Price History Chart conditional check**: Since we reverted the source code changes, the PriceHistoryChart will not render if the product doesn't have price history data.
     - Refactor the chart assertion to be conditional, or locate the heading only if it exists, or check it safely:
       ```typescript
       const historyChartHeader = page.locator('h3:has-text("Evolución de precios")');
       // Assert that if the chart exists, it is visible
       if (await historyChartHeader.count() > 0) {
         await expect(historyChartHeader).toBeVisible();
       }
       ```
   - **Empty State casing robustness**: Search for nonexistent term, but match the empty state text using case-insensitive regex to handle accent updates:
     `const emptyStateHeader = page.locator('h3:has-text(/aún no hay ofertas/i)');`
     Wait! Check what empty state header says exactly (the previous was "Aun no hay ofertas asociadas"). So `/aun no hay ofertas/i` is a safe pattern.

3. Run the E2E tests to verify they pass:
   `npm run test:e2e`
4. Run standard unit/integration tests and linter to make sure they are clean:
   `npm run test`
   `npm run lint`
5. Verify `git diff src/` returns empty.
6. Write your handoff report to E:\soloWeed\.agents\worker_e2e_remediation\handoff.md showing your changes, git status, and test execution results.
7. Send a message when done.

MANDATORY INTEGRITY WARNING:
> DO NOT CHEAT. All implementations must be genuine. DO NOT
> hardcode test results, create dummy/facade implementations, or
> circumvent the intended task. A Forensic Auditor will independently
> verify your work. Integrity violations WILL be detected and your
> work WILL be rejected.

CRITICAL: Absolutely NO files inside `src/` should remain modified. Revert the changes to `src/app/productos/[...slug]/page.tsx` first!
