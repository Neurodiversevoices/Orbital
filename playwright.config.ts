import { defineConfig, devices } from '@playwright/test';

/**
 * Orbital Preflight Test Configuration
 *
 * Runs against the Expo web build served locally.
 * Tests are deterministic - no flaky timers.
 *
 * Best practices applied:
 * - Stable locators (data-testid) over fragile CSS/text selectors
 * - Auto-wait for elements (Playwright default)
 * - Trace/video/screenshot retained on failure for debugging
 * - Controlled parallelism to avoid noisy failures
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // Run tests in sequence for determinism
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1, // More retries in CI for resilience
  workers: 1, // Single worker for determinism
  reporter: [
    ['list'],
    ['./tests/e2e/summary-reporter.ts'],
    // HTML report for detailed debugging
    ['html', { outputFolder: 'test-results/html-report', open: 'never' }],
  ],
  timeout: 30000,
  expect: {
    timeout: 10000,
  },
  // Output directory for test artifacts
  outputDir: 'test-results',
  use: {
    baseURL: 'http://localhost:8085',
    // Guardrails: retain artifacts on failure for debugging
    trace: 'retain-on-failure', // Full trace on failure
    screenshot: 'only-on-failure',
    video: 'retain-on-failure', // Video on failure for debugging
    // Stable navigation
    navigationTimeout: 15000,
    actionTimeout: 10000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npx expo start --web --port 8085',
    port: 8085,
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
  },
});
