const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://127.0.0.1:9292/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  const card = page.locator('#shop [data-product-card]').first();
  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);

  const cardRect = await card.evaluate(el => el.getBoundingClientRect());
  const imgBoxRect = await card.locator('.wm-react-card__image-box').evaluate(el => el.getBoundingClientRect());

  await card.hover();
  await page.waitForTimeout(400);

  const qvWrap = card.locator('.wm-card__img-qv-wrap');
  const wrapRect = await qvWrap.evaluate(el => el.getBoundingClientRect());

  console.log('Card rect:', cardRect);
  console.log('ImgBox rect:', imgBoxRect);
  console.log('Wrap rect on hover:', wrapRect);

  await card.screenshot({ path: 'tests/card-hover-debug.png' });
  await browser.close();
})();
