## 2026-06-30T16:20:08Z

You are worker_e2e. Your working directory is E:\soloWeed\.agents\worker_e2e.
Your task is to implement the E2E testing infra and suite for soloWeed using Playwright, according to the plans developed by the explorers.

Follow these instructions precisely:
1. Update E:\soloWeed\package.json:
   - Add "@playwright/test": "^1.49.0" (or similar appropriate version compatible with Node 20+) to devDependencies.
   - Add the following scripts to package.json:
     "test:e2e": "playwright test",
     "test:e2e:ui": "playwright test --ui",
     "test:e2e:debug": "playwright test --debug",
     "test:e2e:install": "playwright install --with-deps"
2. Run `npm install` to update the dependencies (and automatically generate Prisma client via postinstall if needed).
3. Run `npx playwright install --with-deps` to fetch the required browser binaries.
4. Create E:\soloWeed\playwright.config.ts in the project root:
   - Configure the test directory as "./tests/e2e".
   - Set the baseURL to "http://localhost:3000".
   - Add a webServer section to auto-run `npm run dev` (since Next.js dev server uses Webpack, the command is npm run dev).
   - Set browser projects: Chromium, Firefox, WebKit.
5. Create E:\soloWeed\tests\e2e\catalog.spec.ts:
   - Implement the test cases covering:
     - Catalog loading, header verification, and existence of comparable products (at least one link with text "Comparar").
     - Checking the "Comparar" link href matches the dynamic slug format `/productos/<brandKey>/<modelSlug>`.
     - Executing a search in the input query field and verifying search results filter or empty state.
     - Paginating catalog results (Siguiente/Anterior navigation and page indicator updates).
     - Clicking "Comparar" on the first catalog offer, waiting for navigation, and verifying dynamic detail view elements (h1 product name, summary cards like 'Growshops', 'Con precio', 'Coincidencias', store coverage table/status row in aside, store price cards with stock/shop link, price history chart, and related product links).
6. Verify your implementation by running the tests (e.g. `npm run test:e2e` or `npx playwright test`).
7. Write your handoff report to E:\soloWeed\.agents\worker_e2e\handoff.md documenting your actions, run results, and verifying that no application source code inside `src/` was modified.
8. Send a message when you are done.

MANDATORY INTEGRITY WARNING:
> DO NOT CHEAT. All implementations must be genuine. DO NOT
> hardcode test results, create dummy/facade implementations, or
> circumvent the intended task. A Forensic Auditor will independently
> verify your work. Integrity violations WILL be detected and your
> work WILL be rejected.

CRITICAL: DO NOT modify any files inside the `src/` directory. All changes must be restricted to the root configuration files (package.json, playwright.config.ts) and the new E2E tests folder `tests/e2e/`.
