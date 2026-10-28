const { test, expect } = require('@playwright/test');

test.describe('Wagmart Product Details Page - Tabs Switcher', () => {
  const PRODUCT_URL = 'http://127.0.0.1:9292/products/pet-grooming-glove';

  test('Description tab is open by default; Specifications and Benefits are hidden; clicking buttons displays only that tab', async ({ page }) => {
    await page.goto(PRODUCT_URL);

    const descPill = page.locator('[data-pdp-nav-pill="description"]');
    const specsPill = page.locator('[data-pdp-nav-pill="specifications"]');
    const benefitsPill = page.locator('[data-pdp-nav-pill="benefits"]');

    const descSection = page.locator('#pdp-description');
    const specsSection = page.locator('#pdp-specifications');
    const benefitsSection = page.locator('#pdp-benefits');

    // 1. Verify default state on page load: Description is active, other sections are hidden
    await expect(descPill).toBeVisible();
    await expect(descPill).toHaveClass(/is-active/);
    await expect(descSection).toBeVisible();

    await expect(specsPill).toBeVisible();
    await expect(specsPill).not.toHaveClass(/is-active/);
    await expect(specsSection).toBeHidden();

    await expect(benefitsPill).toBeVisible();
    await expect(benefitsPill).not.toHaveClass(/is-active/);
    await expect(benefitsSection).toBeHidden();

    // 2. Click Specifications: Only Specifications is displayed
    await specsPill.click();

    await expect(specsPill).toHaveClass(/is-active/);
    await expect(specsSection).toBeVisible();
    await expect(descPill).not.toHaveClass(/is-active/);
    await expect(descSection).toBeHidden();
    await expect(benefitsPill).not.toHaveClass(/is-active/);
    await expect(benefitsSection).toBeHidden();

    // 3. Click Benefits: Only Benefits is displayed
    await benefitsPill.click();

    await expect(benefitsPill).toHaveClass(/is-active/);
    await expect(benefitsSection).toBeVisible();
    await expect(descPill).not.toHaveClass(/is-active/);
    await expect(descSection).toBeHidden();
    await expect(specsPill).not.toHaveClass(/is-active/);
    await expect(specsSection).toBeHidden();

    // 4. Click Description: Switches back to Description, others hidden
    await descPill.click();

    await expect(descPill).toHaveClass(/is-active/);
    await expect(descSection).toBeVisible();
    await expect(specsPill).not.toHaveClass(/is-active/);
    await expect(specsSection).toBeHidden();
    await expect(benefitsPill).not.toHaveClass(/is-active/);
    await expect(benefitsSection).toBeHidden();
  });

  test('Heart wishlist button is positioned on top-right of main image and removed from next to Add to Cart', async ({ page }) => {
    await page.goto(PRODUCT_URL);

    // 1. Verify wishlist button is NOT inside .wm-pdp-actions-row (no longer next to Add to Cart)
    const actionRowWishlist = page.locator('.wm-pdp-actions-row [data-pdp-wishlist]');
    await expect(actionRowWishlist).toHaveCount(0);

    // 2. Verify wishlist button exists inside .wm-gallery__stage (on top-right of main image)
    const galleryWishlistBtn = page.locator('.wm-gallery__stage [data-pdp-wishlist]');
    await expect(galleryWishlistBtn).toBeVisible();

    // Verify it is positioned in top-right area
    const boundingBox = await galleryWishlistBtn.boundingBox();
    const stageBox = await page.locator('.wm-gallery__stage').boundingBox();
    expect(boundingBox).toBeTruthy();
    expect(stageBox).toBeTruthy();

    // Button should be near top-right corner of the stage
    expect(boundingBox.y).toBeLessThan(stageBox.y + 50);
    expect(boundingBox.x + boundingBox.width).toBeGreaterThan(stageBox.x + stageBox.width - 70);

    // 3. Test clicking toggles wishlist state and .is-active class
    await galleryWishlistBtn.click();
    await expect(galleryWishlistBtn).toHaveClass(/is-active/);

    // Click again to toggle off
    await galleryWishlistBtn.click();
    await expect(galleryWishlistBtn).not.toHaveClass(/is-active/);
  });
});

