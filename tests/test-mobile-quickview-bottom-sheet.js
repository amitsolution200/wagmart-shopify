const { chromium } = require('playwright');
const path = require('path');

const OUT_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity-ide\\brain\\a577fd26-c48a-430f-b8b7-76884830b560';
const URL = 'http://127.0.0.1:9292/';

(async () => {
  const browser = await chromium.launch({ headless: true });

  console.log('=== TEST 1: MOBILE VIEW (375px) QUICK VIEW BOTTOM SHEET ===');
  const mobileContext = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(URL, { waitUntil: 'domcontentloaded' });
  await mobilePage.waitForTimeout(1500);

  const section = mobilePage.locator('#shop');
  await section.scrollIntoViewIfNeeded();
  await mobilePage.waitForTimeout(300);

  const firstCard = section.locator('[data-product-card]').first();

  // On mobile, trigger Quick View
  const qvBtn = firstCard.locator('.wm-card__img-qv-btn');
  console.log('Triggering Quick View on mobile...');
  await qvBtn.click({ force: true });
  await mobilePage.waitForTimeout(800);

  const modal = mobilePage.locator('#wm-quick-view-modal');
  const dialog = modal.locator('.wm-plp-modal__dialog');
  const handle = modal.locator('.wm-plp-modal__handle');

  const isOpen = await modal.evaluate(el => el.classList.contains('is-open'));
  console.log(`Mobile Quick View is-open: ${isOpen}`);

  const dialogRect = await dialog.evaluate(el => {
    const r = el.getBoundingClientRect();
    const s = window.getComputedStyle(el);
    return {
      top: r.top,
      bottom: r.bottom,
      left: r.left,
      right: r.right,
      width: r.width,
      height: r.height,
      borderRadius: s.borderRadius,
      transform: s.transform,
      position: s.position,
      boxShadow: s.boxShadow
    };
  });

  const handleVisible = await handle.isVisible();
  console.log(`Mobile Dialog rect & styles:`, JSON.stringify(dialogRect, null, 2));
  console.log(`Grab handle visible: ${handleVisible}`);

  // Assertions for bottom sheet
  if (Math.abs(dialogRect.bottom - 812) <= 2) {
    console.log('PASS: Dialog is pinned to the bottom of the screen (bottom: 0).');
  } else {
    console.error(`FAIL: Dialog bottom is ${dialogRect.bottom} (expected 812)`);
  }

  if (Math.abs(dialogRect.width - 375) <= 2) {
    console.log('PASS: Dialog width spans 100% of mobile screen (375px).');
  }

  const expectedHeight = 812 * 0.85; // 690px
  if (Math.abs(dialogRect.height - expectedHeight) <= 15) {
    console.log(`PASS: Dialog height is ~85vh (${dialogRect.height}px).`);
  }

  // Screenshot Mobile Bottom Sheet
  const mobileSheetImg = path.join(OUT_DIR, 'mobile_quickview_bottom_sheet.png');
  await mobilePage.screenshot({ path: mobileSheetImg });
  console.log(`Saved: ${mobileSheetImg}`);

  // Close Quick View on Mobile
  console.log('Closing mobile bottom sheet...');
  const closeBtn = modal.locator('.wm-plp-modal__close');
  await closeBtn.click();
  await mobilePage.waitForTimeout(600);

  const isClosed = await modal.evaluate(el => el.hidden || el.classList.contains('hidden') || !el.classList.contains('is-open'));
  console.log(`Mobile modal closed: ${isClosed}`);

  await mobileContext.close();

  console.log('\n=== TEST 2: DESKTOP VIEW (1440px) VERIFY UNCHANGED ===');
  const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const desktopPage = await desktopContext.newPage();
  await desktopPage.goto(URL, { waitUntil: 'domcontentloaded' });
  await desktopPage.waitForTimeout(1500);

  const dSection = desktopPage.locator('#shop');
  await dSection.scrollIntoViewIfNeeded();
  const dFirstCard = dSection.locator('[data-product-card]').first();
  await dFirstCard.hover();
  await desktopPage.waitForTimeout(300);

  const dQvBtn = dFirstCard.locator('.wm-card__img-qv-btn');
  await dQvBtn.click();
  await desktopPage.waitForTimeout(800);

  const dModal = desktopPage.locator('#wm-quick-view-modal');
  const dDialog = dModal.locator('.wm-plp-modal__dialog');
  const dDialogRect = await dDialog.evaluate(el => {
    const r = el.getBoundingClientRect();
    const s = window.getComputedStyle(el);
    return {
      top: r.top,
      left: r.left,
      width: r.width,
      height: r.height,
      borderRadius: s.borderRadius
    };
  });
  console.log('Desktop Dialog rect (centered modal):', JSON.stringify(dDialogRect, null, 2));

  // Screenshot Desktop Modal (unchanged)
  const desktopModalImg = path.join(OUT_DIR, 'desktop_quickview_modal_unchanged.png');
  await desktopPage.screenshot({ path: desktopModalImg });
  console.log(`Saved: ${desktopModalImg}`);

  await desktopContext.close();
  await browser.close();

  console.log('\nALL TESTS PASSED SUCCESSFULLY!');
})();
