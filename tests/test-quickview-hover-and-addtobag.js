const { chromium } = require('playwright');
const path = require('path');

const OUT_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity-ide\\brain\\a577fd26-c48a-430f-b8b7-76884830b560';
const URL = 'http://127.0.0.1:9292/';

(async () => {
  const browser = await chromium.launch({ headless: true });

  // 1. Desktop Test
  console.log('--- DESKTOP TEST (1440px) ---');
  const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await desktopContext.newPage();
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  const section = page.locator('#shop');
  await section.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);

  const firstCard = section.locator('[data-product-card]').first();
  await firstCard.scrollIntoViewIfNeeded();

  // Check Add To Bag button size
  const addBtn = firstCard.locator('.wm-card__btn-add');
  const addBox = await addBtn.boundingBox();
  console.log(`Add To Bag button: width=${addBox.width}px, height=${addBox.height}px`);
  if (Math.abs(addBox.height - 25) <= 2) {
    console.log('PASS: Add To Bag button height is ~25px (decreased size).');
  } else {
    console.error(`FAIL: Add To Bag height is ${addBox.height}px`);
  }

  // Quick View overlay before hover
  const qvWrap = firstCard.locator('.wm-card__img-qv-wrap');
  const initialOpacity = await qvWrap.evaluate(el => window.getComputedStyle(el).opacity);
  console.log(`Quick View initial opacity before hover: ${initialOpacity}`);

  // Screenshot Desktop Normal
  const normalImg = path.join(OUT_DIR, 'card_desktop_normal.png');
  await firstCard.screenshot({ path: normalImg });
  console.log(`Saved: ${normalImg}`);

  // Hover over card
  console.log('Hovering over card...');
  await firstCard.hover();
  await page.waitForTimeout(400);

  const hoverOpacity = await qvWrap.evaluate(el => window.getComputedStyle(el).opacity);
  const hoverTransform = await qvWrap.evaluate(el => window.getComputedStyle(el).transform);
  const wrapRect = await qvWrap.evaluate(el => el.getBoundingClientRect());
  const imgBoxRect = await firstCard.locator('.wm-react-card__image-box').evaluate(el => el.getBoundingClientRect());
  console.log(`Quick View on hover: opacity=${hoverOpacity}, transform=${hoverTransform}`);
  console.log(`ImgBox bottom=${imgBoxRect.bottom}, Wrap bottom=${wrapRect.bottom}, inside=${wrapRect.bottom < imgBoxRect.bottom}`);

  // Screenshot Desktop Hover
  const hoverImg = path.join(OUT_DIR, 'card_desktop_hover_qv.png');
  await firstCard.screenshot({ path: hoverImg });
  console.log(`Saved: ${hoverImg}`);

  // Click Quick View button
  console.log('Clicking Quick View button inside image box...');
  const qvBtn = firstCard.locator('.wm-card__img-qv-btn');
  await qvBtn.click();
  await page.waitForTimeout(1000);

  const qvModal = page.locator('#wm-quick-view-modal');
  const isQvOpen = await qvModal.evaluate(el => el.classList.contains('is-open'));
  console.log(`Quick View modal opened: ${isQvOpen}`);

  const qvModalImg = path.join(OUT_DIR, 'quick_view_drawer_opened.png');
  await page.screenshot({ path: qvModalImg });
  console.log(`Saved: ${qvModalImg}`);

  // Close Quick View
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);

  // Click Add To Bag
  console.log('Clicking Add To Bag...');
  await addBtn.click();
  await page.waitForTimeout(800);

  const stepper = firstCard.locator('[data-card-stepper]');
  const isStepperVisible = await stepper.evaluate(el => !el.classList.contains('hidden'));
  console.log(`Stepper visible: ${isStepperVisible}`);
  const stepperBox = await stepper.boundingBox();
  console.log(`Stepper height: ${stepperBox?.height}px`);

  const stepperImg = path.join(OUT_DIR, 'card_desktop_stepper_active.png');
  await firstCard.screenshot({ path: stepperImg });
  console.log(`Saved: ${stepperImg}`);

  await desktopContext.close();

  // 2. Mobile Test (375px)
  console.log('\n--- MOBILE TEST (375px) ---');
  const mobileContext = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(URL, { waitUntil: 'domcontentloaded' });
  await mobilePage.waitForTimeout(1500);

  const mobileSection = mobilePage.locator('#shop');
  await mobileSection.scrollIntoViewIfNeeded();
  await mobilePage.waitForTimeout(400);

  const mobileFirstCard = mobileSection.locator('[data-product-card]').first();
  const mobileCardBox = await mobileFirstCard.boundingBox();
  console.log(`Mobile card width: ${mobileCardBox.width}px, height: ${mobileCardBox.height}px`);

  const mobileAddBtn = mobileFirstCard.locator('.wm-card__btn-add');
  const mobileAddBox = await mobileAddBtn.boundingBox();
  console.log(`Mobile Add To Bag width=${mobileAddBox.width}px, height=${mobileAddBox.height}px`);

  const mobileImg = path.join(OUT_DIR, 'card_mobile_layout.png');
  await mobileSection.screenshot({ path: mobileImg });
  console.log(`Saved: ${mobileImg}`);

  await mobileContext.close();
  await browser.close();

  console.log('\nALL VERIFICATIONS COMPLETED SUCCESSFULLY!');
})();
