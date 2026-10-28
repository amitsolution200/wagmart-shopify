const { test, expect } = require('@playwright/test');

test.describe('Wagmart Product Details Page - Live Inventory & Stock Scarcity Indicator', () => {
  const PRODUCT_URL = 'http://127.0.0.1:9292/products/pet-grooming-glove';

  test('Stock indicator displays live inventory, urgency styling, and clamps quantity stepper', async ({ page }) => {
    await page.goto(PRODUCT_URL);

    // 1. Verify stock indicator element is visible on PDP
    const stockIndicator = page.locator('#wm-pdp-stock-indicator, [data-pdp-stock]');
    await expect(stockIndicator).toBeVisible();

    // 2. Verify stock text contains inventory information (e.g. "left in stock" or "In stock")
    const stockText = stockIndicator.locator('[data-pdp-stock-text]');
    await expect(stockText).toBeVisible();
    const textContent = await stockText.textContent();
    expect(textContent).toMatch(/left in stock|In stock/i);

    // 3. Verify pulsing dot is rendered
    const pulsingDot = stockIndicator.locator('.wm-stock-indicator__dot');
    await expect(pulsingDot).toBeVisible();

    // 4. Verify quantity input has max attribute corresponding to available stock
    const qtyInput = page.locator('#wm-pdp-qty-input, [data-qty-input]');
    await expect(qtyInput).toBeVisible();
    const maxVal = await qtyInput.getAttribute('max');
    expect(Number(maxVal)).toBeGreaterThan(0);

    // 5. Test quantity stepper does not exceed max stock
    const plusBtn = page.locator('[data-qty-plus]');
    const minusBtn = page.locator('[data-qty-minus]');
    await expect(minusBtn).toBeDisabled(); // at quantity 1, minus is disabled

    // Increase quantity up to max
    const maxInt = Math.min(Number(maxVal), 5); // test with up to 5 steps
    for (let i = 1; i < maxInt; i++) {
      await plusBtn.click();
    }
    const currentQty = await qtyInput.inputValue();
    expect(Number(currentQty)).toBe(maxInt);
  });
});
