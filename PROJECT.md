# Project: soloWeed Testing Suite

## Architecture
- **Framework**: Playwright E2E Testing Framework
- **Test Target**: Next.js Web App running on local or production port (default http://localhost:3000)
- **Database**: SQLite (read-only for tests)
- **Directory Layout**:
  - `playwright.config.ts`: Configuration file at the root.
  - `tests/e2e/`: Folder holding E2E test files.
  - `tests/e2e/catalog.spec.ts`: Tests covering catalog browsing, filtering, search, and detail views.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| 1 | E2E Infra Setup | Configure Playwright, update package.json, add playwright.config.ts | None | DONE |
| 2 | E2E Test Implementation | Implement tests for catalog browsing, search, and detail view in tests/e2e/catalog.spec.ts | M1 | DONE |

## Interface Contracts
### E2E Test Runner ↔ Web Application
- Port: http://localhost:3000 (standard Next.js dev port)
- Selectors and routing:
  - Homepage: `/`
  - Search: form inputs and search button
  - Catalog Navigation: pagination links/buttons
  - Compare/Detail Link: `a[href^="/productos/"]` or `Link` matching `/productos/<brandKey>/<modelSlug>`
  - Detail View: `/productos/<brandKey>/<modelSlug>` displaying product name, price comparison grid, store status, and related products.

## Code Layout
- `playwright.config.ts` — Playwright runner configuration.
- `tests/e2e/catalog.spec.ts` — Test script for E2E scenarios.
