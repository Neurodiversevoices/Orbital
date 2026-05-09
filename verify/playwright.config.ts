import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: '.',
  reporter: [
    ['json', { outputFile: process.env.HOME + '/Desktop/ORBITAL_RAPID/probes-results.json' }],
    ['list'],
  ],
  use: { actionTimeout: 10000, navigationTimeout: 20000 },
  projects: [
    { name: 'chromium',      use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit',        use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-webkit', use: { ...devices['iPhone 15 Pro'] } },
  ],
});
