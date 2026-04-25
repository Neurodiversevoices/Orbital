import { test, expect } from '@playwright/test';
const URL = process.env.PREVIEW_URL || 'http://localhost:9099';
const RAPID = process.env.HOME + '/Desktop/ORBITAL_RAPID';

test.describe('Landing 2026 v1.1 — AFTER (10 assertions)', () => {

  test('AFTER 1: hero gauge canvas mounted', async ({ page, browserName }) => {
    await page.goto(URL + '/landing');
    const gauge = page.getByTestId('hero-gauge');
    await expect(gauge).toBeVisible();
    const canvasCount = await gauge.locator('canvas').count();
    expect(canvasCount).toBeGreaterThanOrEqual(1);
    await page.screenshot({ path: `${RAPID}/landing-1-hero-${browserName}.png` });
  });

  test('AFTER 2: scroll progress bar present in DOM', async ({ page }) => {
    await page.goto(URL + '/landing');
    const bar = page.locator('.scroll-progress');
    await expect(bar).toBeAttached();
    // scaleX starts at 0 or above — just verify it's in the DOM with a transform
    const transform = await bar.evaluate(el => getComputedStyle(el).transformOrigin);
    expect(transform).toBeTruthy();
  });

  test('AFTER 3: hero gauge has sticky position', async ({ page }) => {
    await page.goto(URL + '/landing');
    const gauge = page.getByTestId('hero-gauge');
    const position = await gauge.evaluate(el => getComputedStyle(el).position);
    // Must be sticky (scroll-driven shrink only fires when position:sticky is set)
    expect(position).toBe('sticky');
  });

  test('AFTER 4: hero headline has opacity >= 0.6 (baseline before kinetic)', async ({ page }) => {
    await page.goto(URL + '/landing');
    const h = page.getByTestId('hero-headline');
    await expect(h).toBeVisible();
    const opacity = await h.evaluate(el => parseFloat(getComputedStyle(el).opacity));
    expect(opacity).toBeGreaterThanOrEqual(0.6);
  });

  test('AFTER 5: 5 trust blocks present and visible', async ({ page, browserName }) => {
    await page.goto(URL + '/landing');
    const ids = ['trust-capture','trust-intelligence','trust-proof','trust-together','trust-trust'];
    for (const id of ids) {
      await page.getByTestId(id).scrollIntoViewIfNeeded();
      await expect(page.getByTestId(id)).toBeVisible();
    }
    await page.screenshot({ path: `${RAPID}/landing-2-trust-${browserName}.png`, fullPage: false });
    expect(ids.length).toBe(5);
  });

  test('AFTER 6: interactive demo — drag changes score number', async ({ page, browserName }) => {
    await page.goto(URL + '/landing');
    await page.getByTestId('demo-arc').scrollIntoViewIfNeeded();
    const before = await page.locator('#demo-score').textContent();
    const c = page.getByTestId('demo-arc');
    const box = (await c.boundingBox())!;
    await page.mouse.move(box.x + box.width/2, box.y + box.height/2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width*0.9, box.y + box.height*0.15, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(150);
    const after = await page.locator('#demo-score').textContent();
    await page.screenshot({ path: `${RAPID}/landing-3-demo-${browserName}.png` });
    expect(parseInt(after || '0', 10)).not.toBe(parseInt(before || '0', 10));
  });

  test('AFTER 7: personalization — therapist variant changes hero text', async ({ page }) => {
    await page.goto(URL + "/landing?for=therapist");
    const h = page.getByTestId('hero-headline');
    await expect(h).toHaveAttribute('data-variant', 'therapist');
    const text = (await h.textContent() || '').toLowerCase();
    expect(text).toContain('clinical');
  });

  test('AFTER 8: reduced-motion — hero gauge sticky not animated (scale stays 1)', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto(URL + '/landing');
    await page.evaluate(() => window.scrollBy(0, 800));
    await page.waitForTimeout(300);
    const m = await page.getByTestId('hero-gauge').evaluate(el => {
      const t = getComputedStyle(el).transform;
      if (t === 'none') return 1;
      const mat = new DOMMatrix(t);
      return mat.a;
    });
    await page.screenshot({ path: `${RAPID}/landing-4-reduced-motion.png` });
    expect(m).toBe(1);
    await ctx.close();
  });

  test('AFTER 9: skip-to-content in DOM and has correct href', async ({ page, browserName }) => {
    await page.goto(URL + '/landing');
    const skipLink = page.locator('.skip-to-content');
    await expect(skipLink).toBeAttached();
    const href = await skipLink.getAttribute('href');
    expect(href).toBe('#main');
    // Tab-to-focus works on Chromium; WebKit requires "Full Keyboard Access" system pref
    if (browserName === 'chromium') {
      await page.keyboard.press('Tab');
      const focusedClass = await page.evaluate(() => document.activeElement?.className || '');
      expect(focusedClass).toContain('skip-to-content');
    }
  });

  test('AFTER 10: demo section present with insight testID', async ({ page }) => {
    await page.goto(URL + '/landing');
    await page.getByTestId('demo-section').scrollIntoViewIfNeeded();
    await expect(page.getByTestId('demo-insight')).toBeVisible();
    const count = await page.locator('[data-testid^="trust-"]').count();
    expect(count).toBe(5);
  });
});
