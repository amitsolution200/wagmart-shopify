const { test, expect } = require('@playwright/test');
const path = require('path');

const OUT_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity-ide\\brain\\9a881d1a-1327-4db3-bf27-204c37f2a959\\.tempmediaStorage';
const URL = 'http://127.0.0.1:9292/products/pet-grooming-glove';

test('More Featured Products: Desktop (1440px) 5 columns & 0 arrows', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  const section = page.locator('.wm-pdp-featured');
  await expect(section).toBeVisible();

  // Verify arrows are completely hidden / absent
  const arrows = section.locator('.wm-pdp-featured__arrow');
  const visibleArrows = await arrows.evaluateAll(els => els.filter(el => window.getComputedStyle(el).display !== 'none').length);
  expect(visibleArrows).toBe(0);

  const grid = section.locator('.wm-pdp-featured__grid');
  const cols = await grid.evaluate(el => window.getComputedStyle(el).gridTemplateColumns.split(' ').length);
  console.log('Desktop (1440px) Grid Columns count:', cols);
  expect(cols).toBe(5);

  await section.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await section.screenshot({ path: path.join(OUT_DIR, 'featured_desktop_5cols.png') });
});

test('More Featured Products: Laptop (1100px) 4 columns & 0 arrows', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  const section = page.locator('.wm-pdp-featured');
  const arrows = section.locator('.wm-pdp-featured__arrow');
  const visibleArrows = await arrows.evaluateAll(els => els.filter(el => window.getComputedStyle(el).display !== 'none').length);
  expect(visibleArrows).toBe(0);

  const grid = section.locator('.wm-pdp-featured__grid');
  const cols = await grid.evaluate(el => window.getComputedStyle(el).gridTemplateColumns.split(' ').length);
  console.log('Laptop (1100px) Grid Columns count:', cols);
  expect(cols).toBe(4);

  await section.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await section.screenshot({ path: path.join(OUT_DIR, 'featured_laptop_4cols.png') });
});

test('More Featured Products: Tablet (820px) 3 columns & 0 arrows (Reference Image 3)', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  const section = page.locator('.wm-pdp-featured');
  const arrows = section.locator('.wm-pdp-featured__arrow');
  const visibleArrows = await arrows.evaluateAll(els => els.filter(el => window.getComputedStyle(el).display !== 'none').length);
  expect(visibleArrows).toBe(0);

  const grid = section.locator('.wm-pdp-featured__grid');
  const cols = await grid.evaluate(el => window.getComputedStyle(el).gridTemplateColumns.split(' ').length);
  console.log('Tablet (820px) Grid Columns count:', cols);
  expect(cols).toBe(3);

  await section.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await section.screenshot({ path: path.join(OUT_DIR, 'featured_tablet_3cols.png') });
});

test('More Featured Products: Mobile (375px) 2 columns & 0 arrows (Reference Image 2)', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  const section = page.locator('.wm-pdp-featured');
  const arrows = section.locator('.wm-pdp-featured__arrow');
  const visibleArrows = await arrows.evaluateAll(els => els.filter(el => window.getComputedStyle(el).display !== 'none').length);
  expect(visibleArrows).toBe(0);

  const grid = section.locator('.wm-pdp-featured__grid');
  const cols = await grid.evaluate(el => window.getComputedStyle(el).gridTemplateColumns.split(' ').length);
  console.log('Mobile (375px) Grid Columns count:', cols);
  expect(cols).toBe(2);

  await section.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await section.screenshot({ path: path.join(OUT_DIR, 'featured_mobile_2cols.png') });
});
