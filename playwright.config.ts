import { defineConfig, devices } from '@playwright/test';

assertSafeE2eEnvironment();

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  timeout: 60000,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: false,
    stdout: 'ignore',
    stderr: 'pipe',
    timeout: 120000,
  },
});

function assertSafeE2eEnvironment() {
  // Listing tests does not start Next.js, so it remains available without a local DB.
  if (process.argv.includes('--list')) return;
  if (process.env.E2E_DATABASE !== '1') {
    throw new Error('Las pruebas E2E requieren E2E_DATABASE=1 y una PostgreSQL efimera/local.');
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('Las pruebas E2E requieren DATABASE_URL local.');

  let hostname = '';
  try {
    hostname = new URL(databaseUrl).hostname;
  } catch {
    throw new Error('DATABASE_URL invalida para E2E.');
  }

  if (!new Set(['127.0.0.1', 'localhost']).has(hostname)) {
    throw new Error(`E2E bloqueado: DATABASE_URL apunta a ${hostname}, no a PostgreSQL local.`);
  }
}
