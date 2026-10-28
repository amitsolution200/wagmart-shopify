const { test, expect } = require('@playwright/test');

test.describe('Wagmart Footer Verification', () => {
  test('desktop footer is responsive, clean, and has correct details', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://127.0.0.1:9292/', { waitUntil: 'networkidle', timeout: 30000 });
    
    const footer = page.locator('.wm-site-footer');
    await footer.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // Verify footer elements
    await expect(footer).toBeVisible();
    await expect(footer).toContainText('Shop No. 312, 3rd Floor, Shivalik Complex');
    await expect(footer).toContainText('+91 77779 85896');
    await expect(footer).toContainText('support@wagmart.com');
    await expect(footer).toContainText('About Us');
    await expect(footer).toContainText('Contact');
    await expect(footer).toContainText('FAQs');
    
    // Verify updated copyright line
    await expect(footer).toContainText('Wagmart. All rights reserved.');
    await expect(footer).not.toContainText('Crafted for the love of pets');

    // Ensure Dry Food & Kibble and Contact Support are removed
    await expect(footer).not.toContainText('Dry Food & Kibble');
    await expect(footer).not.toContainText('Contact Support');
    
    // Ensure center watermark text is removed
    await expect(page.locator('.wm-footer-watermark')).toHaveCount(0);

    // Ensure address does not contain <br> tags
    const addressRow = page.locator('.wm-footer-contact-row--address');
    await expect(addressRow.locator('br')).toHaveCount(0);
    
    // Ensure TryzenIQ is NOT present
    await expect(footer).not.toContainText('TryzenIQ');

    // Verify social button styling
    const socialBtn = page.locator('.wm-footer-social-btn').first();
    await expect(socialBtn).toBeVisible();
    
    // Hover on social button
    await socialBtn.hover();
    await page.waitForTimeout(300);

    await footer.screenshot({ path: 'tests/footer-desktop.png' });
  });

  test('tablet footer is responsive', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('http://127.0.0.1:9292/', { waitUntil: 'networkidle', timeout: 30000 });
    
    const footer = page.locator('.wm-site-footer');
    await footer.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    await expect(footer).toBeVisible();
    await footer.screenshot({ path: 'tests/footer-tablet.png' });
  });

  test('mobile footer is responsive', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('http://127.0.0.1:9292/', { waitUntil: 'networkidle', timeout: 30000 });
    
    // Hide fixed header and skip links for clean viewport capture
    await page.evaluate(() => {
      document.querySelectorAll('.wm-skip-link, .wm-header, header').forEach(el => {
        el.style.display = 'none';
      });
    });

    const footer = page.locator('.wm-site-footer');
    await footer.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    await expect(footer).toBeVisible();
    await footer.screenshot({ path: 'tests/footer-mobile.png' });
  });
});
