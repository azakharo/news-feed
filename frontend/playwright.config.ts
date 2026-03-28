import {defineConfig, devices} from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Sequential for database consistency
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for shared database
  reporter: [
    ['list'],
    ['json', {outputFile: 'test-results/test-results.json'}],
  ],

  // Timeouts
  timeout: 7_500,
  expect: {
    timeout: 5_000,
  },

  use: {
    baseURL: 'http://localhost:4173',
    actionTimeout: 7_500,
    navigationTimeout: 10_000,

    // Artifact collection
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {...devices['Desktop Chrome']},
    },
  ],

  // @ts-ignore
  webServer: {
    command: undefined,
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 10_000,
  },
});
