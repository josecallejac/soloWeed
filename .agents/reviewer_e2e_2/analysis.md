# E2E Testing Infrastructure Review Findings

## Review Summary

**Verdict**: REQUEST_CHANGES

## Findings

### Critical Finding 1: Flawed Regex Pattern in Page 1 Navigation Assertion

- **What**: The regular expression `/(\/|\?.*page=1)/` matches the URL string immediately, regardless of what page we are on.
- **Where**: `tests/e2e/catalog.spec.ts`, Line 47: `await page.waitForURL(/(\/|\?.*page=1)/);`
- **Why**: An absolute URL like `http://localhost:3000/?page=2` contains forward slashes (`http://` and the slash before query params). Therefore, the first branch `\/` matches the absolute URL immediately. The test resolves `waitForURL` instantly on page 2, and then asserts that the page indicator has text `/1 \/`, which fails in WebKit/Safari.
- **Suggestion**: Use a precise function-based URL matcher:
  ```typescript
  await page.waitForURL(url => url.pathname === '/' && (!url.searchParams.has('page') || url.searchParams.get('page') === '1'));
  ```

### Major Finding 2: Unhandled Client-side Hydration Race Condition

- **What**: The detail page navigation test clicks the "Comparar" link immediately when it becomes visible, but before Next.js hydration is finished.
- **Where**: `tests/e2e/catalog.spec.ts`, Line 88: `await compararLink.click();`
- **Why**: In slow browser environments (specifically WebKit/Safari), the static HTML is loaded and the element is visible, but React hydration has not finished binding client-side routing. The click either reloads the page or does nothing because Next.js has executed `e.preventDefault()` but is not yet ready to route, causing a test timeout.
- **Suggestion**: Wait for the network/client state to settle before clicking, or add a load state wait:
  ```typescript
  await page.waitForLoadState('networkidle');
  ```

### Major Finding 3: Interrupted Navigation / Aborted Binding in Firefox Search

- **What**: Submitting the second search query `raw` immediately after the first query results page loads triggers a binding abort.
- **Where**: `tests/e2e/catalog.spec.ts`, Line 73: `await page.waitForURL(/\?.*q=raw/);`
- **Why**: In Firefox, entering text and pressing Enter immediately after the empty state becomes visible triggers a new navigation request while the previous navigation is still being processed/loaded, leading to `NS_BINDING_ABORTED`.
- **Suggestion**: Wait for `networkidle` state between successive search queries, and use a function-based URL check:
  ```typescript
  await page.waitForURL(url => url.searchParams.get('q') === 'raw');
  ```

### Minor Finding 4: ESLint Scanning Conflict with Playwright Output Folders

- **What**: ESLint fails to execute because it tries to scan `test-results/` directory, which is created by Playwright dynamically but lacks proper config exclusion or triggers a race condition.
- **Where**: `eslint.config.mjs`
- **Why**: When running `npm run lint` while Playwright outputs exist, ESLint throws: `Error: ENOENT: no such file or directory, scandir 'E:\soloWeed\test-results'`.
- **Suggestion**: Exclude `test-results` and `playwright-report` explicitly in `eslint.config.mjs` using `globalIgnores`.

---

## Verified Claims

- **Syntax and compilation** → verified via Playwright engine startup → **PASS** (The tests compile and parse correctly).
- **Unit and Integration Tests** → verified via `npm run test` → **PASS** (115 tests passed).
- **Linter execution** → verified via `npm run lint` → **PASS** (passed cleanly after manual cleanup of test-results folders).
- **Source Integrity** → verified via `git diff src/` → **PASS** (The E2E test task did not modify any source code files inside `src/`. Note that `src/app/productos/[...slug]/page.tsx` was modified in the working tree, but this modification was done by previous implementation tasks, not by the E2E implementation itself).

---

## Challenge Summary

**Overall risk assessment**: HIGH

## Challenges

### High Challenge 1: WebKit Hydration Bottlenecks

- **Assumption challenged**: That Next.js is immediately ready to handle router navigation as soon as elements are visible in WebKit.
- **Attack scenario**: Slow server compilation or slow network speeds delay bundle execution. The test clicks the link immediately, resulting in a silent failure to route.
- **Blast radius**: The E2E tests will intermittently or consistently timeout on dynamic product details.
- **Mitigation**: Introduce standard Next.js hydration checks or `waitForLoadState('networkidle')`.

### High Challenge 2: Fragile Regex Patterns for Route Verification

- **Assumption challenged**: That simple regex alternatives like `\/` can verify the home page route safely.
- **Attack scenario**: Any absolute URL containing a protocol (`http://`) or path slashes will match the alternative `\/`, rendering the assertion useless.
- **Blast radius**: Fails to catch incorrect navigation, and causes race conditions by executing assertions too early.
- **Mitigation**: Use function-based URL checks.

### Medium Challenge 3: Unstable Database State Dependency

- **Assumption challenged**: That the test environment database always contains the exact seeded items like "raw" and "Tips Perforated Wide-Raw".
- **Attack scenario**: If the test database is empty, the first and third tests will fail immediately because `Comparar` links won't exist.
- **Blast radius**: High flakiness of tests across different environments.
- **Mitigation**: Seed the database before running E2E tests, or use mocked routes in Playwright if actual database reliance is not required.
