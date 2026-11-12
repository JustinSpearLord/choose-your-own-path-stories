import { defineConfig, devices } from '@playwright/test';

// End-to-end tests run against the production build so the service worker is real.
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173/',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'iPhone 13', use: { ...devices['iPhone 13'] } },
    { name: 'Pixel 7', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173/',
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
