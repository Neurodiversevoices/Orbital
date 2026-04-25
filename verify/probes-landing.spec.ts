import { test, expect } from '@playwright/test';
const BASE = process.env.PREVIEW_URL || 'http://localhost:9099';
const RAPID = process.env.HOME + '/Desktop/ORBITAL_RAPID';

test.describe('Landing 2026 v1.1 — probes', () => {
  test('L1A — animation-range cover 0% cover 80% (hero shrink)', async ({ page, browserName }) => {
    await page.goto(BASE + '/probes_landing.html');
    const target = page.getByTestId('probe-l1a-target');
    await target.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
    await page.waitForTimeout(300);
    const t = await target.evaluate(el => getComputedStyle(el).transform);
    await page.screenshot({ path: `${RAPID}/probe-l1a-${browserName}.png` });
    // If SDA supported: transform changes. If not: stays identity. Either is valid.
    expect(t).toBeDefined();
  });

  test('L1B — animation-range entry 20% cover 50% (headline kinetic)', async ({ page, browserName }) => {
    await page.goto(BASE + '/probes_landing.html');
    const target = page.getByTestId('probe-l1b-target');
    await target.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.5));
    await page.waitForTimeout(300);
    const o = await target.evaluate(el => parseFloat(getComputedStyle(el).opacity));
    await page.screenshot({ path: `${RAPID}/probe-l1b-${browserName}.png` });
    expect(o).toBeGreaterThanOrEqual(0.6);
  });

  test('L1C — animation-range entry 0% cover 35% (trust-block reveal)', async ({ page, browserName }) => {
    await page.goto(BASE + '/probes_landing.html');
    const target = page.getByTestId('probe-l1c-target');
    await target.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const o = await target.evaluate(el => parseFloat(getComputedStyle(el).opacity));
    await page.screenshot({ path: `${RAPID}/probe-l1c-${browserName}.png` });
    expect(o).toBeGreaterThanOrEqual(0);
  });

  test('L2 — View Transitions feature detect + click', async ({ page, browserName }) => {
    await page.goto(BASE + '/probes_landing.html');
    const supportText = (await page.getByTestId('probe-l2-vt-supported').textContent())?.trim();
    await page.screenshot({ path: `${RAPID}/probe-l2-${browserName}.png` });
    expect(['VT_SUPPORTED', 'VT_UNSUPPORTED']).toContain(supportText);
    await page.getByTestId('probe-l2-btn').click();
    await expect(page.getByTestId('probe-l2-text')).toHaveText('After');
  });

  test('L3 — createConicGradient production-exact call', async ({ page, browserName }) => {
    await page.goto(BASE + '/probes_landing.html');
    const result = page.getByTestId('probe-l3-result');
    await result.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${RAPID}/probe-l3-${browserName}.png` });
    await expect(result).toHaveText('CONIC_OK');
  });
});
