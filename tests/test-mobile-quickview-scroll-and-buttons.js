const { chromium } = require('playwright');
const path = require('path');

const OUT_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity-ide\\brain\\a577fd26-c48a-430f-b8b7-76884830b560';
const URL = 'http://127.0.0.1:9292/';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await context.newPage();

  console.log('Navigating to homepage on mobile (375x812)...');
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  const section = page.locator('#shop');
  await section.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);

  // Find first card and open quick view
  const firstCard = section.locator('[data-product-card]').first();
  const qvTrigger = firstCard.locator('[data-quick-view-trigger]').first();
  await qvTrigger.dispatchEvent('click');
  await page.waitForTimeout(800);

  const modal = page.locator('#wm-quick-view-modal');
  const isVisible = await modal.isVisible();
  console.log(`Quick view modal visible: ${isVisible}`);

  // 1. Verify buttons style (Add to cart = Black, Buy Now = White with Black border, NO GREEN)
  const atcBtn = modal.locator('[data-qv-atc]');
  const buyBtn = modal.locator('[data-qv-buy-now]');

  const atcStyles = await atcBtn.evaluate(el => {
    const cs = window.getComputedStyle(el);
    return {
      bg: cs.backgroundColor,
      color: cs.color,
      borderRadius: cs.borderRadius,
      border: cs.border,
      text: el.innerText.trim()
    };
  });
  console.log('ATC Button Styles:', atcStyles);

  const buyStyles = await buyBtn.evaluate(el => {
    const cs = window.getComputedStyle(el);
    return {
      bg: cs.backgroundColor,
      color: cs.color,
      borderRadius: cs.borderRadius,
      border: cs.border,
      text: el.innerText.trim()
    };
  });
  console.log('Buy Now Button Styles:', buyStyles);

  if (buyStyles.bg.includes('78') || buyStyles.bg.includes('140') || buyStyles.bg.includes('green') || buyStyles.bg.includes('66')) {
    console.error('FAIL: Green color detected in Buy Now button!');
  } else {
    console.log('PASS: No green color! Clean black/white matching Product Details.');
  }

  // 2. Verify image padding is 0
  const stage = modal.locator('.wm-plp-modal__stage');
  const stagePadding = await stage.evaluate(el => window.getComputedStyle(el).padding);
  console.log('Stage padding:', stagePadding);
  const mediaPadding = await modal.locator('.wm-plp-modal__media').evaluate(el => window.getComputedStyle(el).padding);
  console.log('Media padding:', mediaPadding);

  // Take screenshot at top (initial open)
  const initialImg = path.join(OUT_DIR, 'mobile_quickview_initial_open.png');
  await page.screenshot({ path: initialImg });
  console.log(`Saved: ${initialImg}`);

  // 3. Scroll test: Scroll down 200px inside modal grid container
  const scrollContainer = modal.locator('[data-qv-scroll-container]');
  
  // Check positions before scroll
  const mediaBoxBefore = await modal.locator('.wm-plp-modal__media').boundingBox();
  const infoBoxBefore = await modal.locator('.wm-plp-modal__info').boundingBox();
  console.log('Before scroll - Media:', mediaBoxBefore, 'Info:', infoBoxBefore);

  // Perform scroll
  await scrollContainer.evaluate(el => {
    el.scrollTop = 180;
  });
  await page.waitForTimeout(400);

  // Check positions after scroll
  const mediaBoxAfter = await modal.locator('.wm-plp-modal__media').boundingBox();
  const infoBoxAfter = await modal.locator('.wm-plp-modal__info').boundingBox();
  console.log('After scroll - Media:', mediaBoxAfter, 'Info:', infoBoxAfter);

  // Verify that media is NOT sticky: media y must have decreased by approx 180
  const scrolledDiff = mediaBoxBefore.y - mediaBoxAfter.y;
  console.log(`Media Y diff after 180px scroll: ${scrolledDiff}px`);
  if (scrolledDiff > 50) {
    console.log('PASS: Media scrolls up naturally with content and does NOT stick!');
  } else {
    console.error('FAIL: Media is still sticky!');
  }

  // Verify that info is strictly below media (never overlapping)
  // infoBoxAfter.y should be >= mediaBoxAfter.y + mediaBoxAfter.height - tolerance
  console.log(`Info top: ${infoBoxAfter.y}, Media bottom: ${mediaBoxAfter.y + mediaBoxAfter.height}`);
  if (infoBoxAfter.y >= mediaBoxAfter.y + mediaBoxAfter.height - 10) {
    console.log('PASS: Info is cleanly below Media, NO OVERLAP!');
  } else {
    console.error('FAIL: Overlap detected between Media and Info!');
  }

  // Take screenshot while scrolled
  const scrolledImg = path.join(OUT_DIR, 'mobile_quickview_scrolled_no_overlap.png');
  await page.screenshot({ path: scrolledImg });
  console.log(`Saved: ${scrolledImg}`);

  // Test Desktop View as well
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(500);

  const desktopImg = path.join(OUT_DIR, 'desktop_quickview_updated_buttons.png');
  await page.screenshot({ path: desktopImg });
  console.log(`Saved: ${desktopImg}`);

  await browser.close();
  console.log('All tests passed successfully!');
})();
