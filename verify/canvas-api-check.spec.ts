import { test, expect } from '@playwright/test';
test.describe('Canvas API', () => {
  test('createConicGradient availability', async ({ page, browserName }, testInfo) => {
    const html = `<!doctype html><html><body>
      <canvas id="c" width="10" height="10"></canvas>
      <div id="result"></div>
      <script>
        const ctx = document.getElementById('c').getContext('2d');
        document.getElementById('result').textContent = typeof ctx.createConicGradient === 'function' ? 'YES' : 'NO';
      </script></body></html>`;
    await page.setContent(html);
    const result = await page.locator('#result').textContent();
    testInfo.annotations.push({ type: 'createConicGradient', description: `${browserName}: ${result}` });
    expect(result?.trim()).toBe('YES');
  });
});
