const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:9292/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  const section = page.locator('#shop');
  const cards = section.locator('[data-product-card]');
  const count = await cards.count();
  console.log(`Total cards: ${count}`);

  for (let i = 0; i < count; i++) {
    const c = cards.nth(i);
    const title = (await c.locator('.wm-card__title').textContent()).trim();
    const cat = await c.getAttribute('data-product-category');
    const badge = (await c.locator('.wm-card__badge').textContent()).trim();
    console.log(`Card ${i + 1}: Title="${title}" | CategoryAttr="${cat}" | Badge="${badge}"`);
  }

  // Click on "Toys & Play"
  console.log('\nClicking "Toys & Play" filter pill...');
  const toysBtn = section.locator('[data-filter-tab="toys"]');
  await toysBtn.click();
  await page.waitForTimeout(500);

  // Check how many cards are visible
  const visibleCards = await cards.evaluateAll(els => {
    return els.map(el => {
      const cs = window.getComputedStyle(el);
      return {
        hasHiddenClass: el.classList.contains('hidden'),
        display: cs.display,
        visibility: cs.visibility,
        offsetWidth: el.offsetWidth,
        title: el.querySelector('.wm-card__title')?.innerText?.trim()
      };
    });
  });
  console.log('Cards state after clicking Toys & Play:', visibleCards);

  await browser.close();
})();
