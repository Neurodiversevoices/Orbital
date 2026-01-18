import { test, expect, Page } from '@playwright/test';

/**
 * Bundle CCI Artifact Smoke Tests
 *
 * Validates the Bundle CCI artifact rendering for 10, 15, and 20 seat configurations.
 *
 * Test contracts:
 * - Outer "preview loaded": data-testid="bundle-cci-ready" (on SafeAreaView wrapper in cci.tsx)
 * - Inner "artifact ready": data-testid="bundle-artifact-ready" (inside iframe, signals safe to capture)
 *
 * These tests verify:
 * 1. Artifact reaches ready state (fonts/chart/layout settled)
 * 2. Correct page count for each seat configuration
 * 3. Captured output is not blank (aggregate section exists)
 * 4. Stable test IDs work reliably
 */

// Timeout for artifact rendering (includes iframe load + chart render)
const ARTIFACT_READY_TIMEOUT = 15000;

/**
 * Wait for app to be ready (hydrated)
 */
async function waitForAppReady(page: Page) {
  await page.waitForSelector('[data-testid="bundle-cci-ready"]', {
    state: 'visible',
    timeout: ARTIFACT_READY_TIMEOUT,
  });
  // Allow React hydration to complete
  await page.waitForTimeout(500);
}

/**
 * Get the iframe frameLocator using stable selector
 */
function getArtifactIframe(page: Page) {
  // Use a more stable selector - the iframe is the only one in the preview section
  return page.frameLocator('iframe');
}

// =============================================================================
// TEST: 20-seat bundle renders correctly with 2 pages
// =============================================================================
test('20-seat bundle renders 2 pages with ready latch', async ({ page }) => {
  // Navigate to bundle CCI with 20 seats
  await page.goto('/cci?type=bundle&seats=20');
  await waitForAppReady(page);

  // Get iframe and wait for artifact ready latch
  const iframe = getArtifactIframe(page);
  const readyLatch = iframe.locator('[data-testid="bundle-artifact-ready"]');
  await readyLatch.waitFor({ state: 'attached', timeout: ARTIFACT_READY_TIMEOUT });

  // Verify seat count attribute
  const seatAttr = await readyLatch.getAttribute('data-seats');
  expect(seatAttr).toBe('20');

  // Verify page count attribute (20 seats = 2 pages)
  const pageAttr = await readyLatch.getAttribute('data-pages');
  expect(pageAttr).toBe('2');

  // Verify density mode (20 seats = dense)
  const densityAttr = await readyLatch.getAttribute('data-density');
  expect(densityAttr).toBe('dense');

  // Verify title shows correct seat count using stable test ID
  const title = iframe.locator('[data-testid="artifact-title"]');
  await expect(title).toContainText('20 Seats');

  // Verify page two exists (multi-page layout)
  const pageTwo = iframe.locator('[data-testid="page-two"]');
  await expect(pageTwo).toBeVisible();

  // Verify aggregate section exists (output is not blank)
  const aggregateSection = iframe.locator('[data-testid="aggregate-section"]');
  await expect(aggregateSection).toBeVisible();

  // Verify footer section exists
  const footerSection = iframe.locator('[data-testid="footer-section"]');
  await expect(footerSection).toBeVisible();

  // Verify both seat grids have content (not blank)
  const seatGridPage1 = iframe.locator('[data-testid="seat-grid-page-1"]');
  const seatGridPage2 = iframe.locator('[data-testid="seat-grid-page-2"]');
  await expect(seatGridPage1).toBeVisible();
  await expect(seatGridPage2).toBeVisible();

  // Verify seat grids contain mini-chart-cards
  const cardsPage1 = iframe.locator('[data-testid="seat-grid-page-1"] .mini-chart-card');
  const cardsPage2 = iframe.locator('[data-testid="seat-grid-page-2"] .mini-chart-card');
  expect(await cardsPage1.count()).toBe(10); // First page: 10 seats
  expect(await cardsPage2.count()).toBe(10); // Second page: 10 seats
});

// =============================================================================
// TEST: 15-seat bundle renders correctly with 2 pages
// =============================================================================
test('15-seat bundle renders 2 pages', async ({ page }) => {
  await page.goto('/cci?type=bundle&seats=15');
  await waitForAppReady(page);

  const iframe = getArtifactIframe(page);
  const readyLatch = iframe.locator('[data-testid="bundle-artifact-ready"]');
  await readyLatch.waitFor({ state: 'attached', timeout: ARTIFACT_READY_TIMEOUT });

  // Verify seat count
  const seatAttr = await readyLatch.getAttribute('data-seats');
  expect(seatAttr).toBe('15');

  // Verify page count (15 seats = 2 pages)
  const pageAttr = await readyLatch.getAttribute('data-pages');
  expect(pageAttr).toBe('2');

  // Verify density mode (15 seats = dense)
  const densityAttr = await readyLatch.getAttribute('data-density');
  expect(densityAttr).toBe('dense');

  // Verify page two exists
  const pageTwo = iframe.locator('[data-testid="page-two"]');
  await expect(pageTwo).toBeVisible();

  // Verify seat distribution: 10 on page 1, 5 on page 2
  const cardsPage1 = iframe.locator('[data-testid="seat-grid-page-1"] .mini-chart-card');
  const cardsPage2 = iframe.locator('[data-testid="seat-grid-page-2"] .mini-chart-card');
  expect(await cardsPage1.count()).toBe(10);
  expect(await cardsPage2.count()).toBe(5);

  // Verify aggregate on final page (not blank)
  const aggregateSection = iframe.locator('[data-testid="aggregate-section"]');
  await expect(aggregateSection).toBeVisible();
});

// =============================================================================
// TEST: 10-seat bundle renders correctly with 1 page
// =============================================================================
test('10-seat bundle renders 1 page', async ({ page }) => {
  await page.goto('/cci?type=bundle&seats=10');
  await waitForAppReady(page);

  const iframe = getArtifactIframe(page);
  const readyLatch = iframe.locator('[data-testid="bundle-artifact-ready"]');
  await readyLatch.waitFor({ state: 'attached', timeout: ARTIFACT_READY_TIMEOUT });

  // Verify seat count
  const seatAttr = await readyLatch.getAttribute('data-seats');
  expect(seatAttr).toBe('10');

  // Verify page count (10 seats = 1 page)
  const pageAttr = await readyLatch.getAttribute('data-pages');
  expect(pageAttr).toBe('1');

  // Verify density mode (10 seats = standard)
  const densityAttr = await readyLatch.getAttribute('data-density');
  expect(densityAttr).toBe('standard');

  // Verify NO page two (single page layout)
  const pageTwo = iframe.locator('[data-testid="page-two"]');
  await expect(pageTwo).toHaveCount(0);

  // Verify all 10 seats on single page
  const cardsPage1 = iframe.locator('[data-testid="seat-grid-page-1"] .mini-chart-card');
  expect(await cardsPage1.count()).toBe(10);

  // Verify aggregate section exists (not blank)
  const aggregateSection = iframe.locator('[data-testid="aggregate-section"]');
  await expect(aggregateSection).toBeVisible();

  // Verify footer section exists
  const footerSection = iframe.locator('[data-testid="footer-section"]');
  await expect(footerSection).toBeVisible();
});

// =============================================================================
// TEST: Default bundle (no seats param) renders as 10 seats
// =============================================================================
test('default bundle renders as 10 seats', async ({ page }) => {
  await page.goto('/cci?type=bundle');
  await waitForAppReady(page);

  const iframe = getArtifactIframe(page);
  const readyLatch = iframe.locator('[data-testid="bundle-artifact-ready"]');
  await readyLatch.waitFor({ state: 'attached', timeout: ARTIFACT_READY_TIMEOUT });

  // Default should be 10 seats
  const seatAttr = await readyLatch.getAttribute('data-seats');
  expect(seatAttr).toBe('10');

  // 10 seats = 1 page
  const pageAttr = await readyLatch.getAttribute('data-pages');
  expect(pageAttr).toBe('1');
});

// =============================================================================
// TEST: Artifact ready latch metadata is accurate
// =============================================================================
test('artifact ready latch contains accurate metadata', async ({ page }) => {
  // Test with 20 seats for comprehensive check
  await page.goto('/cci?type=bundle&seats=20');
  await waitForAppReady(page);

  const iframe = getArtifactIframe(page);
  const readyLatch = iframe.locator('[data-testid="bundle-artifact-ready"]');
  await readyLatch.waitFor({ state: 'attached', timeout: ARTIFACT_READY_TIMEOUT });

  // All required attributes should be present
  await expect(readyLatch).toHaveAttribute('data-seats');
  await expect(readyLatch).toHaveAttribute('data-pages');
  await expect(readyLatch).toHaveAttribute('data-density');

  // Verify latch is hidden (display:none)
  const style = await readyLatch.getAttribute('style');
  expect(style).toContain('display:none');
});
