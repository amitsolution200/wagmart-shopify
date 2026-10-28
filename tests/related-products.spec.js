const { test, expect } = require('@playwright/test');

test.describe('Wagmart Product Details Page - Related Products Section', () => {
  const PRODUCT_URL = 'http://127.0.0.1:9292/products/pet-grooming-glove';

  test('Related Products section renders with heading, badge, and product cards excluding current product', async ({ page }) => {
    await page.goto(PRODUCT_URL);

    // 1. Verify Related Products section is present in DOM and visible
    const relatedSection = page.locator('[data-related-products-section]');
    await expect(relatedSection).toBeVisible();

    // 2. Verify heading and badge
    const badge = relatedSection.locator('.wm-related-products__badge-wrap, .wm-section-badge');
    await expect(badge.first()).toBeVisible();

    const heading = relatedSection.locator('.wm-related-products__title');
    await expect(heading).toContainText('Related Products');

    // 3. Verify product cards exist in the related products grid
    const cards = relatedSection.locator('.wm-related-products__item [data-product-card]');
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThanOrEqual(1);

    // 4. Verify none of the cards have the current product's exact title
    for (let i = 0; i < cardCount; i++) {
      const titleEl = cards.nth(i).locator('h3 a');
      const titleText = (await titleEl.textContent()) || '';
      expect(titleText.toLowerCase().trim()).not.toBe('pet grooming glove');
    }

    // 5. Verify cards have image, title, price with currency symbol (₹)
    const firstCard = cards.first();
    await expect(firstCard.locator('.wm-unified-card__media img')).toBeVisible();
    await expect(firstCard.locator('h3 a')).toBeVisible();
    await expect(firstCard.locator('[data-price-val]')).toContainText('₹');
  });

  test('Carousel navigation controls and Add to Cart work on related product card', async ({ page }) => {
    await page.goto(PRODUCT_URL);

    const relatedSection = page.locator('[data-related-products-section]');
    await expect(relatedSection).toBeVisible();

    // Verify navigation buttons exist
    const prevBtn = relatedSection.locator('[data-related-scroll-prev]');
    const nextBtn = relatedSection.locator('[data-related-scroll-next]');
    await expect(prevBtn).toBeAttached();
    await expect(nextBtn).toBeAttached();

    // Find first product card with an Add to Cart button
    const cardAddToCartBtn = relatedSection.locator('[data-product-card] [data-add-to-cart]').first();
    await expect(cardAddToCartBtn).toBeVisible();

    // Click Add to Cart on the related product
    await cardAddToCartBtn.click();

    // Verify Cart Drawer opens or cart badge count updates
    const drawer = page.locator('#cart-drawer, [data-cart-drawer], .wm-cart-drawer');
    await expect(drawer.first()).toBeVisible({ timeout: 5000 });
  });
});
