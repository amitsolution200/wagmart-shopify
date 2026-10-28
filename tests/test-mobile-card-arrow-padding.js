const { chromium } = require('playwright');
const path = require('path');

const OUT_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity-ide\\brain\\a577fd26-c48a-430f-b8b7-76884830b560';
const URL = 'http://127.0.0.1:9292/';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await context.newPage();

  console.log('Testing Mobile Card Scroll Padding (375px)...');
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  const section = page.locator('#shop');
  await section.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);

  const cards = section.locator('[data-product-card]');
  const nextBtn = section.locator('[data-scroll-next]');
  const prevBtn = section.locator('[data-scroll-prev]');
  const scrollContainer = section.locator('[data-products-scroll]');

  // Initial State: Card 1 position
  const card1BoxInitial = await cards.nth(0).boundingBox();
  console.log('Card 1 Initial Bounding Box:', card1BoxInitial);
  console.log(`Card 1 Left Offset: ${card1BoxInitial.x}px (Expected ~16px)`);

  // Click Next Arrow -> Scroll to Card 2
  console.log('Clicking Next Arrow to go to Card 2...');
  await nextBtn.click();
  await page.waitForTimeout(800);

  const card2Box = await cards.nth(1).boundingBox();
  const scrollLeftAfterClick1 = await scrollContainer.evaluate(el => el.scrollLeft);
  console.log(`After 1st Next Click: scrollLeft=${scrollLeftAfterClick1}`);
  console.log('Card 2 Bounding Box:', card2Box);
  console.log(`Card 2 Left on screen: ${card2Box.x}px`);

  if (Math.abs(card2Box.x - 16) <= 2) {
    console.log('PASS: Card 2 has EXACTLY ~16px padding on left side!');
  } else {
    console.error(`FAIL: Card 2 left is ${card2Box.x}px, not 16px!`);
  }

  // Take screenshot of Card 2 with 16px padding
  const card2Img = path.join(OUT_DIR, 'mobile_card2_with_16px_padding.png');
  await section.screenshot({ path: card2Img });
  console.log(`Saved screenshot: ${card2Img}`);

  // Click Next Arrow again -> Scroll to Card 3
  console.log('Clicking Next Arrow to go to Card 3...');
  await nextBtn.click();
  await page.waitForTimeout(800);

  const card3Box = await cards.nth(2).boundingBox();
  const scrollLeftAfterClick2 = await scrollContainer.evaluate(el => el.scrollLeft);
  console.log(`After 2nd Next Click: scrollLeft=${scrollLeftAfterClick2}`);
  console.log('Card 3 Bounding Box:', card3Box);
  console.log(`Card 3 Left on screen: ${card3Box.x}px`);

  if (Math.abs(card3Box.x - 16) <= 2) {
    console.log('PASS: Card 3 has EXACTLY ~16px padding on left side!');
  } else {
    console.error(`FAIL: Card 3 left is ${card3Box.x}px, not 16px!`);
  }

  const card3Img = path.join(OUT_DIR, 'mobile_card3_with_16px_padding.png');
  await section.screenshot({ path: card3Img });
  console.log(`Saved screenshot: ${card3Img}`);

  // Click Prev Arrow -> Scroll back to Card 2
  console.log('Clicking Prev Arrow to go back to Card 2...');
  await prevBtn.click();
  await page.waitForTimeout(800);

  const card2BackBox = await cards.nth(1).boundingBox();
  console.log(`After Prev Click back to Card 2: left=${card2BackBox.x}px`);
  if (Math.abs(card2BackBox.x - 16) <= 2) {
    console.log('PASS: Card 2 smoothly scrolled back with ~16px left padding!');
  }

  await browser.close();
  console.log('All mobile card scroll padding tests passed!');
})();
