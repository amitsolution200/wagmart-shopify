const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await page.goto('http://127.0.0.1:9292/');
  await page.waitForTimeout(1000);

  // Variant 1: Block centered (width: fit-content, margin: 0 auto, items aligned in block)
  await page.addStyleTag({
    content: `
      @media (max-width: 767px) {
        .wm-site-cta__features {
          display: flex !important;
          flex-direction: column !important;
          align-items: flex-start !important;
          width: fit-content !important;
          max-width: 100% !important;
          margin: 0 auto 24px auto !important;
          gap: 12px !important;
        }
        .wm-site-cta__feature-item {
          white-space: nowrap !important;
          width: 100% !important;
        }
      }
    `
  });
  const cta = page.locator('.wm-site-cta');
  await cta.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await cta.screenshot({ path: 'C:/Users/DELL/.gemini/antigravity-ide/brain/9a881d1a-1327-4db3-bf27-204c37f2a959/.tempmediaStorage/cta_mobile_variant1_block_center.png' });

  // Reload page to reset styles
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  // Variant 2: Each item centered (justify-content: center)
  await page.addStyleTag({
    content: `
      @media (max-width: 767px) {
        .wm-site-cta__features {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          width: 100% !important;
          margin: 0 auto 24px auto !important;
          gap: 12px !important;
        }
        .wm-site-cta__feature-item {
          justify-content: center !important;
          white-space: nowrap !important;
          width: auto !important;
        }
      }
    `
  });
  await cta.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await cta.screenshot({ path: 'C:/Users/DELL/.gemini/antigravity-ide/brain/9a881d1a-1327-4db3-bf27-204c37f2a959/.tempmediaStorage/cta_mobile_variant2_item_center.png' });

  await browser.close();
  console.log('Done testing variants');
})();
