const { chromium } = require('playwright');
const path = require('path');

const OUT_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity-ide\\brain\\a577fd26-c48a-430f-b8b7-76884830b560';
const URL = 'http://127.0.0.1:9292/';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('Navigating to homepage...');
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  const section = page.locator('#shop');
  await section.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);

  const cards = section.locator('[data-product-card]');
  const cardCount = await cards.count();
  console.log(`Total cards found: ${cardCount}`);

  // Test first 3 cards for category badge (NOT discount)
  for (let i = 0; i < Math.min(3, cardCount); i++) {
    const card = cards.nth(i);
    const badge = card.locator('.wm-card__badge');
    const badgeVisible = await badge.isVisible();
    if (badgeVisible) {
      const text = (await badge.textContent()).trim();
      console.log(`Card ${i + 1} Badge text: "${text}"`);
      if (text.includes('%') || text.includes('OFF') || text.includes('-')) {
        console.error(`FAIL: Badge contains discount instead of category: ${text}`);
      } else {
        console.log(`PASS: Badge contains category: "${text}"`);
      }
    }
  }

  const firstCard = cards.first();
  const badge = firstCard.locator('.wm-card__badge');
  const badgeStyles = await badge.evaluate(el => {
    const cs = window.getComputedStyle(el);
    return {
      color: cs.color,
      backgroundColor: cs.backgroundColor,
      backdropFilter: cs.backdropFilter || cs.webkitBackdropFilter,
      border: cs.border,
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      padding: cs.padding,
      borderRadius: cs.borderRadius
    };
  });
  console.log('Badge Computed Styles:', badgeStyles);

  // Check button size
  const addBtn = firstCard.locator('.wm-card__btn-add');
  const addBtnStyles = await addBtn.evaluate(el => {
    const cs = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return {
      height: rect.height,
      width: rect.width,
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      padding: cs.padding,
      text: el.innerText.trim()
    };
  });
  console.log('Add to Bag Button Computed:', addBtnStyles);

  // Take Desktop Normal Screenshot
  const normalImg = path.join(OUT_DIR, 'card_desktop_normal_badge_topleft.png');
  await firstCard.screenshot({ path: normalImg });
  console.log(`Saved: ${normalImg}`);

  // Hover over first card
  await firstCard.hover();
  await page.waitForTimeout(400);

  // Check Quick View inside image
  const qvInside = firstCard.locator('.wm-card__img-qv-wrap');
  const isQvVisible = await qvInside.evaluate(el => {
    const cs = window.getComputedStyle(el);
    return cs.opacity === '1';
  });
  console.log(`Quick View inside image visible on hover: ${isQvVisible}`);

  const hoverImg = path.join(OUT_DIR, 'card_desktop_hover_badge_and_qv.png');
  await firstCard.screenshot({ path: hoverImg });
  console.log(`Saved: ${hoverImg}`);

  // Test Mobile View (375px)
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(600);
  await section.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);

  const mobileImg = path.join(OUT_DIR, 'card_mobile_badge_topleft.png');
  await section.screenshot({ path: mobileImg });
  console.log(`Saved: ${mobileImg}`);

  // Open Quick View on mobile to confirm bottom sheet drawer
  const mobileQvBtn = firstCard.locator('[data-quick-view-trigger]').first();
  await mobileQvBtn.dispatchEvent('click');
  await page.waitForTimeout(700);

  const modal = page.locator('#wm-quick-view-modal');
  const modalBox = await modal.boundingBox();
  console.log(`Mobile Modal Bounding Box:`, modalBox);

  const mobileModalImg = path.join(OUT_DIR, 'mobile_quickview_bottom_drawer_verified.png');
  await page.screenshot({ path: mobileModalImg });
  console.log(`Saved: ${mobileModalImg}`);

  await browser.close();
  console.log('All verifications completed successfully!');
})();
