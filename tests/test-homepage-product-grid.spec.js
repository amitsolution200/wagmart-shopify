const { test, expect } = require('@playwright/test');
const path = require('path');

const OUT_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity-ide\\brain\\1221dfce-b377-4451-8b53-322aef1e6882';
const URL = 'http://127.0.0.1:9292/';

test('Home Page Product Section: Desktop (1440px) 5 cards in 1 row with arrows & dots', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  const section = page.locator('#shop');
  await expect(section).toBeVisible();

  // Verify arrows are VISIBLE
  const prevBtn = section.locator('[data-scroll-prev]');
  const nextBtn = section.locator('[data-scroll-next]');
  await expect(prevBtn).toBeVisible();
  await expect(nextBtn).toBeVisible();

  // Verify dots are VISIBLE
  const dots = section.locator('[data-products-dots]');
  await expect(dots).toBeVisible();

  // Verify single row: cards share the same top offset
  const cards = section.locator('[data-product-card]');
  const count = await cards.count();
  expect(count).toBeGreaterThanOrEqual(5);

  const tops = await cards.evaluateAll(els => els.slice(0, 5).map(el => Math.round(el.getBoundingClientRect().top)));
  console.log('Desktop first 5 cards tops:', tops);
  // All cards in the first 5 must be on the same horizontal row (same top)
  expect(tops.every(t => Math.abs(t - tops[0]) <= 2)).toBe(true);

  // Check card width: 5 cards fit container
  const container = section.locator('[data-products-scroll]');
  const containerWidth = await container.evaluate(el => el.clientWidth);
  const cardWidth = await cards.first().evaluate(el => el.getBoundingClientRect().width);
  console.log(`Desktop Container width: ${containerWidth}, Card width: ${cardWidth}`);
  // (containerWidth - 4 * 20) / 5 ~ cardWidth
  const expectedWidth = (containerWidth - 80) / 5;
  expect(Math.abs(cardWidth - expectedWidth)).toBeLessThanOrEqual(3);

  // Test Next Arrow Click
  const initialScroll = await container.evaluate(el => el.scrollLeft);
  await nextBtn.click();
  await page.waitForTimeout(600);
  const scrolledLeft = await container.evaluate(el => el.scrollLeft);
  console.log(`Initial scroll: ${initialScroll}, After Next click: ${scrolledLeft}`);
  expect(scrolledLeft).toBeGreaterThan(initialScroll);

  // Screenshot
  await page.addStyleTag({ content: '#shopify-section-header, header, .header-wrapper { position: static !important; }' });
  await section.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await section.screenshot({ path: path.join(OUT_DIR, 'homepage_desktop_1row_5cols.png') });
});

test('Home Page Product Section: Laptop (1100px) 4 cards in 1 row with arrows & dots', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  const section = page.locator('#shop');
  const prevBtn = section.locator('[data-scroll-prev]');
  const nextBtn = section.locator('[data-scroll-next]');
  await expect(prevBtn).toBeVisible();
  await expect(nextBtn).toBeVisible();

  const dots = section.locator('[data-products-dots]');
  await expect(dots).toBeVisible();

  const cards = section.locator('[data-product-card]');
  const container = section.locator('[data-products-scroll]');
  const containerWidth = await container.evaluate(el => el.clientWidth);
  const cardWidth = await cards.first().evaluate(el => el.getBoundingClientRect().width);
  console.log(`Laptop Container width: ${containerWidth}, Card width: ${cardWidth}`);
  // (containerWidth - 3 * 18) / 4 ~ cardWidth
  const expectedWidth = (containerWidth - 54) / 4;
  expect(Math.abs(cardWidth - expectedWidth)).toBeLessThanOrEqual(3);

  await page.addStyleTag({ content: '#shopify-section-header, header, .header-wrapper { position: static !important; }' });
  await section.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await section.screenshot({ path: path.join(OUT_DIR, 'homepage_laptop_1row_4cols.png') });
});

test('Home Page Product Section: Tablet (820px) 3 cards in 1 row with arrows & dots', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  const section = page.locator('#shop');
  const prevBtn = section.locator('[data-scroll-prev]');
  const nextBtn = section.locator('[data-scroll-next]');
  await expect(prevBtn).toBeVisible();
  await expect(nextBtn).toBeVisible();

  const dots = section.locator('[data-products-dots]');
  await expect(dots).toBeVisible();

  const cards = section.locator('[data-product-card]');
  const container = section.locator('[data-products-scroll]');
  const containerWidth = await container.evaluate(el => el.clientWidth);
  const cardWidth = await cards.first().evaluate(el => el.getBoundingClientRect().width);
  console.log(`Tablet Container width: ${containerWidth}, Card width: ${cardWidth}`);
  // (containerWidth - 2 * 16) / 3 ~ cardWidth
  const expectedWidth = (containerWidth - 32) / 3;
  expect(Math.abs(cardWidth - expectedWidth)).toBeLessThanOrEqual(3);

  await page.addStyleTag({ content: '#shopify-section-header, header, .header-wrapper { position: static !important; }' });
  await section.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await section.screenshot({ path: path.join(OUT_DIR, 'homepage_tablet_1row_3cols.png') });
});

test('Home Page Product Section: Mobile (375px) 2 cards in 1 row with arrows & dots', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  const section = page.locator('#shop');
  const prevBtn = section.locator('[data-scroll-prev]');
  const nextBtn = section.locator('[data-scroll-next]');
  await expect(prevBtn).toBeVisible();
  await expect(nextBtn).toBeVisible();

  const dots = section.locator('[data-products-dots]');
  await expect(dots).toBeVisible();

  const cards = section.locator('[data-product-card]');
  const container = section.locator('[data-products-scroll]');
  const containerWidth = await container.evaluate(el => el.clientWidth);
  const cardWidth = await cards.first().evaluate(el => Math.round(el.getBoundingClientRect().width));
  const cardHeight = await cards.first().evaluate(el => Math.round(el.getBoundingClientRect().height));
  console.log(`Mobile Container width: ${containerWidth}, Card width: ${cardWidth}, Card height: ${cardHeight}`);
  expect(Math.abs(cardWidth - 220)).toBeLessThanOrEqual(2);
  expect(Math.abs(cardHeight - 332)).toBeLessThanOrEqual(5);

  // Single row: cards 1 and 2 share the same top offset
  const tops = await cards.evaluateAll(els => els.slice(0, 2).map(el => Math.round(el.getBoundingClientRect().top)));
  console.log('Mobile first 2 cards tops:', tops);
  expect(tops[0]).toBe(tops[1]);

  await page.addStyleTag({ content: '#shopify-section-header, header, .header-wrapper { position: static !important; }' });
  await section.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await section.screenshot({ path: path.join(OUT_DIR, 'homepage_mobile_1row_2cols.png') });
});
