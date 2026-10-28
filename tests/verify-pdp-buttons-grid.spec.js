const { test, expect } = require('@playwright/test');
const path = require('path');

const OUT_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity-ide\\brain\\9a881d1a-1327-4db3-bf27-204c37f2a959\\.tempmediaStorage';
const URL = 'http://127.0.0.1:9292/products/pet-grooming-glove';

test('PDP Buttons: Mobile (375px) stacked vertically (No change)', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  const buttonsWrap = page.locator('.wm-pdp-react__buttons');
  await buttonsWrap.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);

  const atc = page.locator('#wm-pdp-atc-btn');
  const buyNow = page.locator('#wm-pdp-buy-now-btn');

  const atcBox = await atc.boundingBox();
  const buyNowBox = await buyNow.boundingBox();

  console.log('Mobile - ATC Y:', atcBox.y, 'BuyNow Y:', buyNowBox.y);
  // Stacked vertically: Buy Now is below ATC
  expect(buyNowBox.y).toBeGreaterThan(atcBox.y + atcBox.height - 2);

  await buttonsWrap.screenshot({ path: path.join(OUT_DIR, 'pdp_buttons_mobile_stacked.png') });
});

test('PDP Buttons: Tablet (820px) 2-column grid (Left ATC, Right Buy Now)', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  const buttonsWrap = page.locator('.wm-pdp-react__buttons');
  await buttonsWrap.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);

  const atc = page.locator('#wm-pdp-atc-btn');
  const buyNow = page.locator('#wm-pdp-buy-now-btn');

  const atcBox = await atc.boundingBox();
  const buyNowBox = await buyNow.boundingBox();

  console.log('Tablet - ATC X:', atcBox.x, 'BuyNow X:', buyNowBox.x);
  console.log('Tablet - ATC Y:', atcBox.y, 'BuyNow Y:', buyNowBox.y);

  // Side-by-side: Buy Now is to the right of ATC
  expect(buyNowBox.x).toBeGreaterThan(atcBox.x + atcBox.width - 2);
  // Aligned on the same horizontal row
  expect(Math.abs(atcBox.y - buyNowBox.y)).toBeLessThan(4);

  await buttonsWrap.screenshot({ path: path.join(OUT_DIR, 'pdp_buttons_tablet_grid.png') });
});

test('PDP Buttons: Laptop (1100px) 2-column grid (Left ATC, Right Buy Now)', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  const buttonsWrap = page.locator('.wm-pdp-react__buttons');
  await buttonsWrap.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);

  const atc = page.locator('#wm-pdp-atc-btn');
  const buyNow = page.locator('#wm-pdp-buy-now-btn');

  const atcBox = await atc.boundingBox();
  const buyNowBox = await buyNow.boundingBox();

  console.log('Laptop - ATC X:', atcBox.x, 'BuyNow X:', buyNowBox.x);
  console.log('Laptop - ATC Y:', atcBox.y, 'BuyNow Y:', buyNowBox.y);

  // Side-by-side: Buy Now is to the right of ATC
  expect(buyNowBox.x).toBeGreaterThan(atcBox.x + atcBox.width - 2);
  expect(Math.abs(atcBox.y - buyNowBox.y)).toBeLessThan(4);

  await buttonsWrap.screenshot({ path: path.join(OUT_DIR, 'pdp_buttons_laptop_grid.png') });
});

test('PDP Buttons: Desktop (1440px) 2-column grid (Left ATC, Right Buy Now)', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  const buttonsWrap = page.locator('.wm-pdp-react__buttons');
  await buttonsWrap.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);

  const atc = page.locator('#wm-pdp-atc-btn');
  const buyNow = page.locator('#wm-pdp-buy-now-btn');

  const atcBox = await atc.boundingBox();
  const buyNowBox = await buyNow.boundingBox();

  console.log('Desktop - ATC X:', atcBox.x, 'BuyNow X:', buyNowBox.x);
  console.log('Desktop - ATC Y:', atcBox.y, 'BuyNow Y:', buyNowBox.y);

  expect(buyNowBox.x).toBeGreaterThan(atcBox.x + atcBox.width - 2);
  expect(Math.abs(atcBox.y - buyNowBox.y)).toBeLessThan(4);

  await buttonsWrap.screenshot({ path: path.join(OUT_DIR, 'pdp_buttons_desktop_grid.png') });
});
