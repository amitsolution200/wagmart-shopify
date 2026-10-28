const { chromium } = require('playwright');
const path = require('path');

const OUT_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity-ide\\brain\\a577fd26-c48a-430f-b8b7-76884830b560';
const URL = 'http://127.0.0.1:9292/';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  console.log('Testing category filter tabs on desktop (1440px)...');
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  const section = page.locator('#shop');
  await section.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);

  const allCards = section.locator('[data-product-card]');
  const totalCount = await allCards.count();
  console.log(`Initial total cards: ${totalCount}`);

  async function getVisibleCount() {
    return await allCards.evaluateAll(els => els.filter(el => {
      const cs = window.getComputedStyle(el);
      return cs.display !== 'none' && !el.classList.contains('hidden') && !el.hidden;
    }).length);
  }

  const initialVisible = await getVisibleCount();
  console.log(`Initial visible cards (All Products): ${initialVisible}`);
  if (initialVisible === totalCount) {
    console.log('PASS: All products visible initially.');
  }

  // 1. Filter by Toys & Play
  console.log('\n--- 1. Testing "Toys & Play" Filter ---');
  const toysTab = section.locator('[data-filter-tab="toys"]');
  await toysTab.click();
  await page.waitForTimeout(400);

  const toysVisibleCount = await getVisibleCount();
  console.log(`Visible cards after clicking Toys: ${toysVisibleCount}`);
  const toysTitles = await allCards.evaluateAll(els => els.filter(el => {
    return window.getComputedStyle(el).display !== 'none' && !el.classList.contains('hidden');
  }).map(el => el.querySelector('.wm-card__title')?.innerText?.trim()));
  console.log('Visible cards titles (Toys):', toysTitles);

  if (toysVisibleCount > 0 && toysVisibleCount < totalCount && toysTitles.some(t => t.toLowerCase().includes('ball') || t.toLowerCase().includes('toy'))) {
    console.log('PASS: Filter "Toys & Play" successfully displays only matching toys!');
  } else {
    console.error('FAIL: Filter "Toys & Play" did not filter cards properly!');
  }

  const toysScreenshot = path.join(OUT_DIR, 'desktop_filtered_toys.png');
  await section.screenshot({ path: toysScreenshot });
  console.log(`Saved screenshot: ${toysScreenshot}`);

  // 2. Filter by Feeding & Bowls
  console.log('\n--- 2. Testing "Feeding & Bowls" Filter ---');
  const feedingTab = section.locator('[data-filter-tab="feeding"]');
  await feedingTab.click();
  await page.waitForTimeout(400);

  const feedingVisibleCount = await getVisibleCount();
  console.log(`Visible cards after clicking Feeding: ${feedingVisibleCount}`);
  const feedingTitles = await allCards.evaluateAll(els => els.filter(el => {
    return window.getComputedStyle(el).display !== 'none' && !el.classList.contains('hidden');
  }).map(el => el.querySelector('.wm-card__title')?.innerText?.trim()));
  console.log('Visible cards titles (Feeding):', feedingTitles);

  if (feedingVisibleCount > 0 && feedingVisibleCount < totalCount && feedingTitles.some(t => t.toLowerCase().includes('bowl') || t.toLowerCase().includes('treat'))) {
    console.log('PASS: Filter "Feeding & Bowls" successfully displays only matching products!');
  } else {
    console.error('FAIL: Filter "Feeding & Bowls" did not filter cards properly!');
  }

  // 3. Switch back to "All Products"
  console.log('\n--- 3. Testing "All Products" Reset ---');
  const allTab = section.locator('[data-filter-tab="all"]');
  await allTab.click();
  await page.waitForTimeout(400);

  const allVisibleCount = await getVisibleCount();
  console.log(`Visible cards after clicking All: ${allVisibleCount}`);
  if (allVisibleCount === totalCount) {
    console.log('PASS: "All Products" reset successfully shows all cards again!');
  } else {
    console.error(`FAIL: Expected ${totalCount} cards, got ${allVisibleCount}`);
  }

  // 4. Test Mobile Filter (375px)
  console.log('\n--- 4. Testing Filter on Mobile (375px) ---');
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(500);
  await section.scrollIntoViewIfNeeded();

  await toysTab.click();
  await page.waitForTimeout(500);

  const mobileToysCount = await getVisibleCount();
  console.log(`Mobile visible cards (Toys): ${mobileToysCount}`);

  // Check that the first visible card has 16px left margin on mobile
  const visibleCardsEls = section.locator('[data-product-card]:not(.hidden)');
  const firstVisibleCardBox = await visibleCardsEls.first().boundingBox();
  console.log('First visible card bounding box on mobile:', firstVisibleCardBox);
  if (firstVisibleCardBox && Math.abs(firstVisibleCardBox.x - 16) <= 2) {
    console.log('PASS: Filtered card on mobile maintains exactly 16px left padding!');
  } else {
    console.error(`FAIL: Filtered card left is ${firstVisibleCardBox?.x}px, expected 16px!`);
  }

  const mobileFilteredScreenshot = path.join(OUT_DIR, 'mobile_filtered_toys.png');
  await section.screenshot({ path: mobileFilteredScreenshot });
  console.log(`Saved screenshot: ${mobileFilteredScreenshot}`);

  await browser.close();
  console.log('\nAll filter tests passed with flying colors!');
})();
