const { test, expect } = require('@playwright/test');

test.describe('Why Choose Wagmart Section Verification', () => {
  test('Verify desktop rendering (1440px)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 950 });
    await page.goto('http://127.0.0.1:9292/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const section = page.locator('.wm-why-choose');
    await expect(section).toBeVisible();

    // Check eyebrow, heading, and description
    await expect(page.locator('.wm-why-choose__eyebrow')).toContainText('WHY PET PARENTS LOVE US');
    await expect(page.locator('.wm-why-choose__title')).toContainText('Why Choose Wagmart?');
    await expect(page.locator('.wm-why-choose__desc')).toContainText("We're passionate about pets");

    // Check all 4 items
    const benefitTitles = page.locator('.wm-why-choose__benefit-title');
    await expect(benefitTitles).toHaveCount(4);
    await expect(benefitTitles.nth(0)).toHaveText('Premium Pet Essentials');
    await expect(benefitTitles.nth(1)).toHaveText('Fast & Reliable Delivery');
    await expect(benefitTitles.nth(2)).toHaveText('Trusted Quality & Safety');
    await expect(benefitTitles.nth(3)).toHaveText('Friendly Customer Support');

    // Check CTA button
    const ctaBtn = page.locator('.wm-why-choose__btn');
    await expect(ctaBtn).toBeVisible();
    await expect(ctaBtn).toContainText('Shop Now');

    // Check right-side image
    const photo = page.locator('.wm-why-choose__img');
    await expect(photo).toBeVisible();

    // Scroll to section and take screenshot
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await section.screenshot({ path: 'tests/why-choose-desktop.png' });
  });

  test('Verify tablet rendering (768px)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('http://127.0.0.1:9292/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const section = page.locator('.wm-why-choose');
    await expect(section).toBeVisible();
    await section.scrollIntoViewIfNeeded();
    await page.evaluate(() => {
      const sticky = document.querySelectorAll('header, .header-wrapper, #shopify-section-header, .sticky');
      sticky.forEach(el => { el.style.display = 'none'; });
    });
    await page.waitForTimeout(400);
    await section.screenshot({ path: 'tests/why-choose-tablet.png' });
  });

  test('Verify mobile rendering (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('http://127.0.0.1:9292/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const section = page.locator('.wm-why-choose');
    await expect(section).toBeVisible();
    await section.scrollIntoViewIfNeeded();
    await page.evaluate(() => {
      const sticky = document.querySelectorAll('header, .header-wrapper, #shopify-section-header, .sticky');
      sticky.forEach(el => { el.style.display = 'none'; });
    });
    await page.waitForTimeout(400);
    await section.screenshot({ path: 'tests/why-choose-mobile.png' });
  });
});
