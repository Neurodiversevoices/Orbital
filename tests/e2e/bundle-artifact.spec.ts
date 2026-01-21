import { test, expect, Page } from '@playwright/test';

/**
 * Bundle CCI Artifact Smoke Tests
 *
 * Validates that bundle artifacts render correctly for 10, 15, and 20 seats.
 * Uses the ready-to-capture latch (data-testid="bundle-artifact-ready") to ensure
 * content is fully rendered before assertions.
 *
 * These tests are designed to catch regressions in:
 * - Seat count propagation from URL params
 * - Pagination (1 page for 10 seats, 2 pages for 15/20)
 * - Density mode (standard vs dense)
 */

// Helper to wait for app to be ready
async function waitForAppReady(page: Page) {
  await page.waitForSelector('[data-testid="bundle-cci-ready"]', {
    state: 'visible',
    timeout: 15000,
  });
}

// Helper to get artifact iframe
function getArtifactFrame(page: Page) {
  return page.frameLocator('iframe[title="CCI-Q4 Instrument Preview"]');
}

// ═══════════════════════════════════════════════════════════════════════════
// 10-SEAT BUNDLE (Standard Density, 1 Page)
// ═══════════════════════════════════════════════════════════════════════════
test.describe('10-Seat Bundle', () => {
  test('renders single page with standard density', async ({ page }) => {
    await page.goto('/cci?type=bundle&seats=10');
    await waitForAppReady(page);

    const iframe = getArtifactFrame(page);

    // Wait for artifact ready latch
    const latch = iframe.locator('[data-testid="bundle-artifact-ready"]');
    await latch.waitFor({ timeout: 10000 });

    // Verify seat count
    const seatAttr = await latch.getAttribute('data-seats');
    expect(seatAttr).toBe('10');

    // Verify page count (should be 1)
    const pageAttr = await latch.getAttribute('data-pages');
    expect(pageAttr).toBe('1');

    // Verify density mode (should be standard)
    const densityAttr = await latch.getAttribute('data-density');
    expect(densityAttr).toBe('standard');

    // Verify title shows "10 Seats"
    const title = await iframe.locator('.artifact-title').textContent();
    expect(title).toContain('10 Seats');

    // Verify NO page-two element (single page)
    const pageTwoCount = await iframe.locator('.page-two').count();
    expect(pageTwoCount).toBe(0);

    // Verify aggregate chart exists
    const aggregateChart = await iframe.locator('.aggregate-chart-container').count();
    expect(aggregateChart).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 15-SEAT BUNDLE (Dense Mode, 2 Pages)
// ═══════════════════════════════════════════════════════════════════════════
test.describe('15-Seat Bundle', () => {
  test('renders 2 pages with dense density', async ({ page }) => {
    await page.goto('/cci?type=bundle&seats=15');
    await waitForAppReady(page);

    const iframe = getArtifactFrame(page);

    // Wait for artifact ready latch
    const latch = iframe.locator('[data-testid="bundle-artifact-ready"]');
    await latch.waitFor({ timeout: 10000 });

    // Verify seat count
    const seatAttr = await latch.getAttribute('data-seats');
    expect(seatAttr).toBe('15');

    // Verify page count (should be 2)
    const pageAttr = await latch.getAttribute('data-pages');
    expect(pageAttr).toBe('2');

    // Verify density mode (should be dense)
    const densityAttr = await latch.getAttribute('data-density');
    expect(densityAttr).toBe('dense');

    // Verify title shows "15 Seats"
    const title = await iframe.locator('.artifact-title').textContent();
    expect(title).toContain('15 Seats');

    // Verify page-two element exists (multi-page)
    const pageTwoCount = await iframe.locator('.page-two').count();
    expect(pageTwoCount).toBe(1);

    // Verify continuation header
    const continuationHeader = await iframe.locator('.continuation-header').textContent();
    expect(continuationHeader).toContain('15 Seats');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 20-SEAT BUNDLE (Dense Mode, 2 Pages) - SMOKE TEST
// ═══════════════════════════════════════════════════════════════════════════
test.describe('20-Seat Bundle', () => {
  test('renders 2 pages with dense density and all 20 seats', async ({ page }) => {
    await page.goto('/cci?type=bundle&seats=20');
    await waitForAppReady(page);

    const iframe = getArtifactFrame(page);

    // Wait for artifact ready latch
    const latch = iframe.locator('[data-testid="bundle-artifact-ready"]');
    await latch.waitFor({ timeout: 10000 });

    // Verify seat count
    const seatAttr = await latch.getAttribute('data-seats');
    expect(seatAttr).toBe('20');

    // Verify page count (should be 2)
    const pageAttr = await latch.getAttribute('data-pages');
    expect(pageAttr).toBe('2');

    // Verify density mode (should be dense)
    const densityAttr = await latch.getAttribute('data-density');
    expect(densityAttr).toBe('dense');

    // Verify title shows "20 Seats"
    const title = await iframe.locator('.artifact-title').textContent();
    expect(title).toContain('20 Seats');

    // Verify page-two element exists (multi-page)
    const pageTwoCount = await iframe.locator('.page-two').count();
    expect(pageTwoCount).toBe(1);

    // Verify continuation header mentions 20 seats
    const continuationHeader = await iframe.locator('.continuation-header').textContent();
    expect(continuationHeader).toContain('20 Seats');

    // Verify aggregate chart on page 2 (hero chart always present)
    const aggregateOnPageTwo = await iframe.locator('.page-two .aggregate-chart-container').count();
    expect(aggregateOnPageTwo).toBe(1);

    // Verify total mini-chart-cards equals 20 (4 rows × 5 seats)
    const miniChartCards = await iframe.locator('.mini-chart-card').count();
    expect(miniChartCards).toBe(20);
  });

  test('20-seat PDF renders without errors', async ({ page }) => {
    // This is the critical smoke test for 20-seat PDF regression
    await page.goto('/cci?type=bundle&seats=20');
    await waitForAppReady(page);

    const iframe = getArtifactFrame(page);

    // Wait for ready latch - if this succeeds, PDF capture will work
    const latch = iframe.locator('[data-testid="bundle-artifact-ready"]');
    await expect(latch).toBeAttached({ timeout: 10000 });

    // Verify no error states in the page
    const errorText = page.getByText(/error|failed|invalid/i);
    const errorCount = await errorText.count();
    expect(errorCount).toBe(0);

    // Verify the bundle badge shows BUNDLE
    const bundleBadge = await iframe.locator('.bundle-badge').textContent();
    expect(bundleBadge).toBe('BUNDLE');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// NAVIGATION INTEGRITY
// ═══════════════════════════════════════════════════════════════════════════
test.describe('Bundle Navigation', () => {
  test('URL params are source of truth for seat count', async ({ page }) => {
    // Test that changing URL param changes the rendered seats
    const testCases = [
      { seats: '10', expected: '10' },
      { seats: '15', expected: '15' },
      { seats: '20', expected: '20' },
    ];

    for (const tc of testCases) {
      await page.goto(`/cci?type=bundle&seats=${tc.seats}`);
      await waitForAppReady(page);

      const iframe = getArtifactFrame(page);
      const latch = iframe.locator('[data-testid="bundle-artifact-ready"]');
      await latch.waitFor({ timeout: 10000 });

      const seatAttr = await latch.getAttribute('data-seats');
      expect(seatAttr).toBe(tc.expected);
    }
  });

  test('invalid seat count defaults to 10', async ({ page }) => {
    // Test that invalid seat counts fall back to 10
    await page.goto('/cci?type=bundle&seats=99');
    await waitForAppReady(page);

    const iframe = getArtifactFrame(page);
    const latch = iframe.locator('[data-testid="bundle-artifact-ready"]');
    await latch.waitFor({ timeout: 10000 });

    // Should default to 10 seats
    const seatAttr = await latch.getAttribute('data-seats');
    expect(seatAttr).toBe('10');
  });
});
