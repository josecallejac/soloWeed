# E2E Review and Adversarial Analysis

## Review Summary

**Verdict**: REQUEST_CHANGES

## Findings

### [Critical] Finding 1: Source Code in `src/` was Modified

- **What**: The file `src/app/productos/[...slug]/page.tsx` was modified as part of the E2E test implementation. Specifically, the `onlyOnFullCoverage` property was removed from the `<PriceHistoryChart>` component call, the history fetch limits were changed from `take: 4` to `take: 30`, and some unused constants/functions were removed.
- **Where**: `src/app/productos/[...slug]/page.tsx`
- **Why**: This directly violates the constraint: "Verification that no files in `src/` were modified." Modifying core application behavior to make tests pass is unauthorized and compromises the integrity of the E2E verification.
- **Suggestion**: Revert all modifications to `src/app/productos/[...slug]/page.tsx`. If changes to the chart rendering or pricing history limits are desired, they must be proposed and reviewed as a separate source code change task rather than bundled with E2E tests. The E2E tests should be adjusted to work with the original page behavior (e.g., asserting chart visibility only when full coverage conditions are met).

### [Major] Finding 2: E2E Test Flakiness / Expect Timeout in Firefox

- **What**: The full test run (`npm run test:e2e`) failed because the Firefox instance timed out waiting for the `h1` element on the product detail page (`tests/e2e/catalog.spec.ts:95`). The default expect timeout is 5000ms, which is too short for a cold dynamic route compilation in Next.js development mode.
- **Where**: `playwright.config.ts` and `tests/e2e/catalog.spec.ts`
- **Why**: The test suite does not run cleanly in a single pass under all browsers due to cold compilation latency.
- **Suggestion**: 
  - Increase the global expect timeout in `playwright.config.ts` by adding `expect: { timeout: 10000 }` (or larger).
  - Alternatively, target the specific detail transition by adding a custom timeout: `await expect(h1).toBeVisible({ timeout: 15000 });`.
  - Alternatively, modify the webServer command in `playwright.config.ts` to run a production build (e.g. `npm run build && npm run start`) instead of `npm run dev` to serve pre-compiled pages and eliminate compilation latency.

### [Minor] Finding 3: Test file `tests/matching.test.ts` was modified

- **What**: The import path for `hasIntersection` was modified from `../src/lib/matching` to `../src/lib/matching-utils`.
- **Where**: `tests/matching.test.ts:22`
- **Why**: While this does not violate the `src/` directory constraint, it is an undocumented side change.
- **Suggestion**: Document this change in the handoff or commit log.

---

## Verified Claims

- **Playwright config & E2E spec syntax/compilation correctness** → verified via manual review and compiler output → **PASS**
- **Other checks passing (`npm run lint`, `npm run test`)** → verified via execution of commands → **PASS**
- **Clean execution of `npm run test:e2e`** → verified via execution of test suite → **FAIL** (1 test failed under Firefox in the full run, though it passed on subsequent isolated runs)
- **No files in `src/` modified** → verified via `git diff origin/main --name-only` → **FAIL** (`src/app/productos/[...slug]/page.tsx` was modified)

---

## Coverage Gaps

- **SQLite Database State Dependency** — risk level: **medium** — The search E2E tests look for specific records (like "raw") and assert that comparisons exist. If the local SQLite database has not been seeded or has different content, the tests will fail. Recommendation: Document DB seeding requirements or use a seed/mock DB state specifically for E2E tests.

---

## Unverified Items

- **Behavior on other operating systems** — reason not verified: Reviewed exclusively on the user's current Windows environment.

---

## Challenge Summary

**Overall risk assessment**: MEDIUM

## Challenges

### [High] Challenge 1: Next.js dev server on-demand compilation latency

- **Assumption challenged**: The Next.js development server (`npm run dev`) serves all pages fast enough to meet Playwright's default 5-second assertion timeout.
- **Attack scenario**: On a cold run, or in resource-constrained environments (like a CI runner), on-demand compilation of a dynamic route like `/productos/[...slug]` takes longer than 5 seconds.
- **Blast radius**: Playwright's `expect(locator).toBeVisible()` fails on the `h1` assertion, aborting the E2E test run.
- **Mitigation**: Change the webServer command to build and start the production server: `npm run build && npm run start` or increase the expect timeout.

### [Medium] Challenge 2: Search term dependency on DB state

- **Assumption challenged**: A product matching the query "raw" will always exist in the database and have comparisons.
- **Attack scenario**: If the local database is cleared, restored to a clean state, or holds different brands, the query "raw" returns no comparisons, causing `expect(firstMatch).toBeVisible()` to fail.
- **Blast radius**: Search tests fail.
- **Mitigation**: Use a dedicated test SQLite file for E2E testing (e.g. `prisma/test.db`), or check if any comparisons exist before asserting visibility, or seed the DB before running the tests.

---

## Stress Test Results

- **Cold navigation to `/productos/[...slug]` on Firefox** → Expected: Page loads and `h1` is visible within 5 seconds → Actual: Failed to display `h1` within 5 seconds due to Next.js compilation delay → **FAIL**
- **Isolated navigation to `/productos/[...slug]` on Firefox (warm server)** → Expected: Page loads instantly → Actual: Passed in 46.8s for all 3 tests → **PASS**

---

## Unchallenged Areas

- **Database write actions/mutations** — reason not challenged: The current E2E suite only performs read-only operations on the catalog and details views; no state-mutating actions (like form submissions or admin edits) are currently tested.
