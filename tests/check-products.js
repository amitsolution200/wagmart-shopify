const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:9292/');
  await page.waitForTimeout(1000);

  const cards = page.locator('#shop [data-product-card]');
  const count = await cards.count();
  console.log(`Found ${count} cards on homepage.`);

  for (let i = 0; i < count; i++) {
    const card = cards.nth(i);
    const title = await card.getAttribute('data-product-name');
    const price = await card.getAttribute('data-product-price');
    const compPrice = await card.getAttribute('data-product-compare-price');
    const badgeEl = card.locator('.wm-react-card__image-box span.absolute.top-2\\.5');
    const hasBadge = await badgeEl.count() > 0;
    const badgeText = hasBadge ? await badgeEl.first().textContent() : 'NONE';
    console.log(`Card ${i + 1}: "${title}" | Price: ${price} | Compare: ${compPrice} | Badge: ${badgeText.trim()}`);
  }

  await browser.close();
})();
