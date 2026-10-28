const { test, expect } = require('@playwright/test');

test('Verify collection page badge removed and bg white', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto('http://127.0.0.1:9292/collections/all', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // Check that eyebrow badge is gone
  await expect(page.locator('.wm-plp-hero__eyebrow')).toHaveCount(0);
  const heroContent = await page.locator('.wm-plp-hero__content').innerText();
  expect(heroContent).not.toContain('WAGMART PET SUPPLIES');

  // Verify background is white
  const bgColor = await page.evaluate(() => {
    return window.getComputedStyle(document.querySelector('.wm-plp')).backgroundColor;
  });
  expect(bgColor).toBe('rgb(255, 255, 255)');

  await page.screenshot({ path: 'tests/collection-page-after.png', fullPage: false });
});

test('Verify collection page mobile rendering', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('http://127.0.0.1:9292/collections/all', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  await expect(page.locator('.wm-plp-hero__eyebrow')).toHaveCount(0);
  await page.screenshot({ path: 'tests/collection-page-mobile.png', fullPage: false });
});
