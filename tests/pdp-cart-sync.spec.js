const { test, expect } = require('@playwright/test');

test.describe('Wagmart Product Details Page - Live Cart Count & Stepper Synchronization', () => {
  const PRODUCT_URL = 'http://127.0.0.1:9292/products/pet-grooming-glove';

  test.beforeEach(async ({ page }) => {
    // Navigate to homepage first and clear cart to start clean
    await page.goto('http://127.0.0.1:9292/');
    await page.evaluate(() => {
      if (window.WagmartCart) {
        window.WagmartCart.clear();
      }
      try {
        localStorage.removeItem('wagmart_local_cart');
      } catch (e) {}
    });
  });

  test('PDP stepper and in-cart notification pill synchronize with Cart state and Drawer', async ({ page }) => {
    await page.goto(PRODUCT_URL);

    const qtyInput = page.locator('#wm-pdp-qty-input, [data-qty-input]');
    const plusBtn = page.locator('[data-qty-plus]');
    const minusBtn = page.locator('[data-qty-minus]');
    const atcBtn = page.locator('#wm-pdp-atc-btn, [data-pdp-atc-btn]');
    const atcBtnText = atcBtn.locator('[data-atc-text]');
    const inCartPill = page.locator('#wm-pdp-in-cart-pill, [data-pdp-in-cart-pill]');

    // 1. Initial State: clean cart, input is 1, pill is hidden, button says Add to Cart
    await expect(qtyInput).toHaveValue('1');
    await expect(inCartPill).toBeHidden();
    await expect(atcBtnText).toHaveText('Add to Cart');

    // 2. Add to Cart
    await atcBtn.click();
    await page.waitForTimeout(600);

    // 3. After adding to cart:
    // In-cart pill must be visible with "1 in your cart"
    await expect(inCartPill).toBeVisible();
    await expect(inCartPill).toContainText('1 in your cart');
    await expect(atcBtnText).toContainText('Update Cart (1)');

    // Close drawer to test PDP stepper interactions
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    // 4. Increase quantity via PDP stepper [+] to 2
    await plusBtn.click();
    await page.waitForTimeout(500);

    await expect(qtyInput).toHaveValue('2');
    await expect(inCartPill).toContainText('2 in your cart');
    await expect(atcBtnText).toContainText('Update Cart (2)');

    // 5. Increase quantity further to 5 (matching user scenario)
    await plusBtn.click();
    await page.waitForTimeout(400);
    await plusBtn.click();
    await page.waitForTimeout(400);
    await plusBtn.click();
    await page.waitForTimeout(500);

    await expect(qtyInput).toHaveValue('5');
    await expect(inCartPill).toContainText('5 in your cart');
    await expect(atcBtnText).toContainText('Update Cart (5)');

    // 6. Open Cart Drawer via the in-cart pill "View Cart" button
    const viewCartBtn = inCartPill.locator('[data-pdp-open-cart-drawer]');
    await viewCartBtn.click();

    // Verify Cart Drawer is open and contains quantity 5
    const cartDrawer = page.locator('#cart-drawer');
    await expect(cartDrawer).toBeVisible();
    const drawerItem = cartDrawer.locator('.wm-line').first();
    await expect(drawerItem).toBeVisible();
    await expect(drawerItem.locator('output')).toHaveText('5');

    // 7. Decrease quantity back to 4 via PDP stepper [-]
    // Close drawer first
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    await minusBtn.click();
    await page.waitForTimeout(500);

    await expect(qtyInput).toHaveValue('4');
    await expect(inCartPill).toContainText('4 in your cart');
    await expect(atcBtnText).toContainText('Update Cart (4)');
  });
});
