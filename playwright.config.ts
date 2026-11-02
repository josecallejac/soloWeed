import { defineConfig, devices } from '@playwright/test';
import { assertSafeE2eEnvironment } from './scripts/lib/e2e-database';

// --list only collects tests and does not run global setup or start Next.js.
if (!process.argv.includes('--list')) assertSafeE2eEnvironment();

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
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
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'] },
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
    command: 'npm run start',
    env: { NEXT_PUBLIC_SITE_URL: 'http://localhost:3000' },
    url: 'http://localhost:3000',
    reuseExistingServer: false,
    stdout: 'ignore',
    stderr: 'pipe',
    timeout: 120000,
  },
});
