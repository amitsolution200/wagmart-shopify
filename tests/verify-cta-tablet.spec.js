const { test, expect } = require('@playwright/test');
const path = require('path');

const OUT_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity-ide\\brain\\9a881d1a-1327-4db3-bf27-204c37f2a959\\.tempmediaStorage';
const URL = 'http://127.0.0.1:9292/';

test('Capture CTA section at Mobile, Tablet, Desktop', async ({ page }) => {
  // Mobile 375px
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const cta = page.locator('.wm-site-cta');
  await cta.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await cta.screenshot({ path: path.join(OUT_DIR, 'cta_mobile_after.png') });

  // Tablet 820px
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.waitForTimeout(500);
  await cta.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);

  const gridDirection820 = await page.locator('.wm-site-cta__grid').evaluate(el => window.getComputedStyle(el).flexDirection);
  console.log('Tablet (820px) Grid flex-direction:', gridDirection820);
  expect(gridDirection820).toBe('column');

  await cta.screenshot({ path: path.join(OUT_DIR, 'cta_tablet_after.png') });

  // Tablet 768px
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForTimeout(500);
  await cta.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);

  const gridDirection768 = await page.locator('.wm-site-cta__grid').evaluate(el => window.getComputedStyle(el).flexDirection);
  console.log('Tablet (768px) Grid flex-direction:', gridDirection768);
  expect(gridDirection768).toBe('column');

  await cta.screenshot({ path: path.join(OUT_DIR, 'cta_tablet_768_after.png') });

  // Desktop 1440px
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(500);
  await cta.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);

  const gridDisplayDesktop = await page.locator('.wm-site-cta__grid').evaluate(el => window.getComputedStyle(el).display);
  console.log('Desktop (1440px) Grid display:', gridDisplayDesktop);
  expect(gridDisplayDesktop).toBe('grid');

  await cta.screenshot({ path: path.join(OUT_DIR, 'cta_desktop_after.png') });
});
