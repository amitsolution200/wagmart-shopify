// @ts-check
const { test, expect } = require('@playwright/test');
const http = require('http');
const fs = require('fs');
const path = require('path');

let server;
let baseUrl;

const mockCollections = [
  {
    title: 'Pet Grooming & Care',
    handle: 'pet-grooming-care',
    count: 2,
    products: [
      { id: '101', title: 'Pet Grooming Glove', price: '330', compare_price: '499', on_sale: true, available: true, image: 'catalog-bath-massage-brush.webp' },
      { id: '102', title: 'Wagmart Pet Grooming Brush', price: '399', compare_price: '549', on_sale: true, available: true, image: 'catalog-bath-massage-brush.webp' }
    ]
  },
  {
    title: 'Pet Feeding & Watering',
    handle: 'pet-feeding-watering',
    count: 1,
    products: [
      { id: '201', title: 'Wagmart Pet Feeding Bowl', price: '449', compare_price: '599', on_sale: true, available: true, image: 'catalog-bath-massage-brush.webp' }
    ]
  },
  {
    title: 'Pet Food & Treats',
    handle: 'pet-food-treats',
    count: 1,
    products: [
      { id: '301', title: 'Grain-Free Salmon Dog Treats', price: '299', compare_price: '', on_sale: false, available: true, image: 'catalog-bath-massage-brush.webp' }
    ]
  },
  {
    title: 'Pet Collars, Leashes & Walking',
    handle: 'pet-collars-leashes-walking',
    count: 1,
    products: [
      { id: '401', title: 'Reflective Padded Dog Leash', price: '499', compare_price: '699', on_sale: true, available: true, image: 'catalog-bath-massage-brush.webp' }
    ]
  },
  {
    title: 'Pet Health & Wellness',
    handle: 'pet-health-wellness',
    count: 0,
    products: []
  }
];

function generateHeaderPageHtml() {
  const headerCss = fs.readFileSync(path.join(__dirname, '..', 'assets', 'header.css'), 'utf8');

  const allProductsTabHtml = `
    <li class="wm-mega-split__nav-item" role="presentation">
      <a
        href="/collections/all"
        class="wm-mega-split__tab is-active"
        role="tab"
        id="wm-tab-all-products"
        aria-selected="true"
        aria-controls="wm-panel-all-products"
        data-mega-tab="all-products"
      >
        <span class="wm-mega-split__tab-text">All Products</span>
        <span class="wm-mega-split__tab-count">5</span>
        <svg class="wm-mega-split__tab-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </a>
    </li>
  `;

  const collectionTabsHtml = allProductsTabHtml + mockCollections.map((col) => `
    <li class="wm-mega-split__nav-item" role="presentation">
      <a
        href="/collections/${col.handle}"
        class="wm-mega-split__tab"
        role="tab"
        id="wm-tab-${col.handle}"
        aria-selected="false"
        aria-controls="wm-panel-${col.handle}"
        data-mega-tab="${col.handle}"
      >
        <span class="wm-mega-split__tab-text">${col.title}</span>
        <span class="wm-mega-split__tab-count">${col.count}</span>
        <svg class="wm-mega-split__tab-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </a>
    </li>
  `).join('');

  const allProductsPanelHtml = `
    <div
      class="wm-mega-split__panel is-active"
      id="wm-panel-all-products"
      role="tabpanel"
      aria-labelledby="wm-tab-all-products"
      data-mega-panel="all-products"
    >
      <div class="wm-mega-split__panel-head">
        <div>
          <h3 class="wm-mega-split__panel-title">All Pet Care Products</h3>
          <p class="wm-mega-split__panel-desc">Hand-picked bestsellers and daily essentials</p>
        </div>
        <a href="/collections/all" class="wm-link-arrow">View all products &rarr;</a>
      </div>
      <div class="wm-mega-split__grid">
        <article class="wm-mega-product-card" data-product-card data-product-id="101">
          <a href="/products/101" class="wm-mega-product-card__link-wrap">
            <div class="wm-mega-product-card__media">
              <img src="/assets/catalog-bath-massage-brush.webp" alt="Pet Grooming Glove" class="wm-mega-product-card__img" width="240" height="240">
            </div>
            <div class="wm-mega-product-card__body">
              <h4 class="wm-mega-product-card__title">Pet Grooming Glove</h4>
              <div class="wm-mega-product-card__price-row">
                <span class="wm-mega-product-card__price">₹330</span>
              </div>
            </div>
          </a>
        </article>
      </div>
    </div>
  `;

  const collectionPanelsHtml = allProductsPanelHtml + mockCollections.map((col) => `
    <div
      class="wm-mega-split__panel"
      id="wm-panel-${col.handle}"
      role="tabpanel"
      aria-labelledby="wm-tab-${col.handle}"
      data-mega-panel="${col.handle}"
    >
      <div class="wm-mega-split__panel-head">
        <div>
          <h3 class="wm-mega-split__panel-title">${col.title}</h3>
          <p class="wm-mega-split__panel-desc">Explore top items in ${col.title}</p>
        </div>
        <a href="/collections/${col.handle}" class="wm-link-arrow">View all ${col.title} &rarr;</a>
      </div>

      ${col.products.length > 0 ? `
        <div class="wm-mega-split__grid">
          ${col.products.map(p => `
            <article class="wm-mega-product-card" data-product-card data-product-id="${p.id}">
              <a href="/products/${p.id}" class="wm-mega-product-card__link-wrap">
                <div class="wm-mega-product-card__media">
                  <img src="/assets/${p.image}" alt="${p.title}" class="wm-mega-product-card__img" width="240" height="240">
                  ${p.on_sale ? '<span class="wm-mega-product-card__tag wm-mega-product-card__tag--sale">Sale</span>' : ''}
                </div>
                <div class="wm-mega-product-card__body">
                  <h4 class="wm-mega-product-card__title">${p.title}</h4>
                  <div class="wm-mega-product-card__price-row">
                    <span class="wm-mega-product-card__price">₹${p.price}</span>
                    ${p.compare_price ? `<span class="wm-mega-product-card__compare">₹${p.compare_price}</span>` : ''}
                  </div>
                </div>
              </a>
            </article>
          `).join('')}
        </div>
      ` : `
        <div class="wm-mega-split__empty">
          <p class="wm-mega-split__empty-text">No products currently listed in <strong>${col.title}</strong>.</p>
        </div>
      `}
    </div>
  `).join('');

  const mobileSublinksHtml = `
    <li class="wm-mnav__subitem wm-mnav__subitem--all">
      <a class="wm-mnav__sublink wm-mnav__sublink--all" href="/collections/all">
        <span>All Products</span>
        <svg class="wm-mnav__subarrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
      </a>
    </li>
  ` + mockCollections.map(col => `
    <li class="wm-mnav__subitem">
      <a class="wm-mnav__sublink" href="/collections/${col.handle}">
        <span>${col.title}</span>
        <svg class="wm-mnav__subarrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </a>
    </li>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Wagmart - Pet Products</title>
  <style>
    :root {
      --wm-bg: #FFFFFF;
      --wm-nav-bg: #FFFFFF;
      --wm-text: #1F2937;
      --wm-text-2: #4B5563;
      --wm-text-3: #9CA3AF;
      --wm-purple: #7A46E5;
      --wm-pink: #FF5376;
      --wm-font: system-ui, -apple-system, sans-serif;
      --wm-radius: 16px;
      --wm-radius-sm: 8px;
      --wm-fast: 0.15s;
      --wm-med: 0.25s;
      --wm-ease: ease;
    }
    body { margin: 0; font-family: var(--wm-font); color: var(--wm-text); background: #FAF8F5; }
    ${headerCss}
  </style>
</head>
<body>
  <header class="wm-header" data-wm-header>
    <div class="wm-header__shell" data-header-shell>
      <div class="wm-header__bar">
        <div class="wm-header__start">
          <button type="button" class="wm-icon-btn wm-only-mobile" data-drawer-open aria-controls="WmMobileDrawer" aria-expanded="false" aria-label="Open menu">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>

          <nav class="wm-nav" aria-label="Main">
            <ul class="wm-nav__list">
              <li>
                <button
                  type="button"
                  class="wm-nav__link"
                  id="WmTriggerCollections"
                  data-panel-trigger="collections"
                  aria-expanded="false"
                  aria-controls="WmPanelCollections"
                >
                  Collections <svg class="wm-nav__chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
              </li>
              <li><a class="wm-nav__link" data-nav-plain href="/pages/faqs">FAQs</a></li>
              <li><a class="wm-nav__link" data-nav-plain href="/blogs/news">Blog</a></li>
              <li><a class="wm-nav__link" data-nav-plain href="/pages/contact">Contact</a></li>
            </ul>
          </nav>
        </div>

        <a href="/" class="wm-header__logo" aria-label="Wagmart" data-nav-plain>
          <strong>WAGMART</strong>
        </a>

        <div class="wm-header__end">
          <button type="button" class="wm-icon-btn" aria-label="Search"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></button>
          <button type="button" class="wm-icon-btn" data-open-cart aria-label="Cart"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg></button>
        </div>
      </div>

      <!-- DESKTOP MEGA MENU DROPDOWN -->
      <div class="wm-panel" id="WmPanelCollections" data-panel="collections" aria-labelledby="WmTriggerCollections">
        <div class="wm-panel__inner">
          <div class="wm-mega-split" data-mega-split>
            <!-- LEFT COLUMN: Collections List -->
            <aside class="wm-mega-split__sidebar" aria-label="Store Collections">
              <div class="wm-mega-split__sidebar-head">
                <span class="wm-mega__heading-dot" aria-hidden="true"></span>
                <span class="wm-mega-split__sidebar-title">Categories</span>
              </div>
              <ul class="wm-mega-split__nav" role="tablist" aria-orientation="vertical">
                ${collectionTabsHtml}
              </ul>
              <div class="wm-mega-split__sidebar-footer">
                <a href="/collections/all" class="wm-link-arrow">Shop all collections &rarr;</a>
              </div>
            </aside>

            <!-- RIGHT COLUMN: Related Products Showcase (Hover changes panel) -->
            <main class="wm-mega-split__showcase" aria-label="Collection Products Preview">
              ${collectionPanelsHtml}
            </main>
          </div>
        </div>
      </div>
    </div>

    <!-- MOBILE / TABLET NAVIGATION DRAWER -->
    <div class="wm-drawer" id="WmMobileDrawer" data-drawer aria-hidden="true">
      <div class="wm-backdrop" data-drawer-close></div>
      <div class="wm-drawer__panel" role="dialog" aria-modal="true" aria-label="Menu" tabindex="-1">
        <div class="wm-drawer__head">
          <span>WAGMART</span>
          <button type="button" class="wm-close-btn" data-drawer-close aria-label="Close menu">&times;</button>
        </div>
        <div class="wm-drawer__body">
          <ul class="wm-mnav">
            <li>
              <div class="wm-mnav__row">
                <button type="button" class="wm-mnav__link" aria-expanded="false" aria-controls="WmMCollections" data-accordion-toggle>Collections</button>
                <button type="button" class="wm-mnav__toggle" aria-expanded="false" aria-controls="WmMCollections" aria-label="Show Collections" data-accordion-toggle>
                  <svg class="wm-nav__chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
              </div>
              <div class="wm-acc" id="WmMCollections">
                <div class="wm-acc__inner">
                  <div class="wm-acc__content">
                    <!-- Mobile only shows collection names with All Products at top -->
                    <ul class="wm-mnav__sublist">
                      ${mobileSublinksHtml}
                    </ul>
                  </div>
                </div>
              </div>
            </li>
            <li><a class="wm-mnav__link" href="/pages/faqs">FAQs</a></li>
            <li><a class="wm-mnav__link" href="/blogs/news">Blog</a></li>
            <li><a class="wm-mnav__link" href="/pages/contact">Contact</a></li>
          </ul>
        </div>
      </div>
    </div>
  </header>

  <script src="/assets/header.js"></script>
</body>
</html>`;
}

test.beforeAll(async () => {
  server = http.createServer((req, res) => {
    const urlObj = new URL(req.url, 'http://127.0.0.1');

    if (urlObj.pathname.startsWith('/assets/')) {
      const fileName = path.basename(urlObj.pathname);
      const filePath = path.join(__dirname, '..', 'assets', fileName);
      if (fs.existsSync(filePath)) {
        const ext = path.extname(filePath);
        let contentType = 'text/plain';
        if (ext === '.css') contentType = 'text/css';
        else if (ext === '.js') contentType = 'application/javascript';
        else if (ext === '.webp') contentType = 'image/webp';
        res.writeHead(200, { 'Content-Type': contentType });
        return res.end(fs.readFileSync(filePath));
      }
      res.writeHead(404);
      return res.end('Not found');
    }

    if (urlObj.pathname === '/') {
      const html = generateHeaderPageHtml();
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(html);
    }

    res.writeHead(404);
    res.end('Not Found');
  });

  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

test.afterAll(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

test.describe('Wagmart Navbar Mega Menu - Collection Hover & Mobile Behavior', () => {

  test('1. Desktop: Hovering navbar opens collections mega menu; left side shows collections; hovering collection switches related products on right', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(baseUrl);

    // 1. Locate the collections trigger button in desktop navbar
    const trigger = page.locator('#WmTriggerCollections, [data-panel-trigger="collections"]').first();
    await expect(trigger).toBeVisible();

    const megaPanel = page.locator('#WmPanelCollections, [data-panel="collections"]');
    await expect(megaPanel).not.toHaveClass(/is-open/);

    // 2. Hover over the trigger button in navbar
    await trigger.hover();
    await expect(megaPanel).toHaveClass(/is-open/);

    // 3. Verify left side has collection list tabs with All Products at the top
    const collectionTabs = page.locator('[data-mega-tab]');
    const count = await collectionTabs.count();
    expect(count).toBeGreaterThan(0);

    // The first tab (All Products) is at the top and active by default
    const firstTab = collectionTabs.first();
    await expect(firstTab).toHaveClass(/is-active/);
    expect(await firstTab.textContent()).toContain('All Products');

    const firstHandle = await firstTab.getAttribute('data-mega-tab');
    expect(firstHandle).toBe('all-products');
    const firstPanel = page.locator(`[data-mega-panel="${firstHandle}"]`);
    await expect(firstPanel).toBeVisible();
    await expect(firstPanel).toHaveClass(/is-active/);

    // 4. Hover over second collection tab (Pet Grooming & Care)
    const secondTab = collectionTabs.nth(1);
    const secondHandle = await secondTab.getAttribute('data-mega-tab');
    const secondPanel = page.locator(`[data-mega-panel="${secondHandle}"]`);

    await secondTab.hover();

    // Second tab becomes active, first tab is no longer active
    await expect(secondTab).toHaveClass(/is-active/);
    await expect(firstTab).not.toHaveClass(/is-active/);

    // Second panel becomes visible with its related products, first panel is hidden
    await expect(secondPanel).toBeVisible();
    await expect(secondPanel).toHaveClass(/is-active/);
    await expect(firstPanel).toBeHidden();

    // Verify products inside the second collection panel
    const productsInSecond = secondPanel.locator('[data-product-card]');
    await expect(productsInSecond).toHaveCount(2);
    await expect(secondPanel.locator('.wm-mega-product-card__title').first()).toContainText('Pet Grooming Glove');
  });

  test('2. Mobile: Drawer shows ONLY collection names with All Products at the top and NO products', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(baseUrl);

    // 1. Open mobile drawer
    const drawerOpenBtn = page.locator('[data-drawer-open]');
    await expect(drawerOpenBtn).toBeVisible();
    await drawerOpenBtn.click();

    const drawer = page.locator('#WmMobileDrawer');
    await expect(drawer).toHaveClass(/is-open/);

    // 2. Click accordion toggle to expand collections
    const accordionToggle = drawer.locator('#WmMCollections').locator('xpath=preceding-sibling::div').locator('[data-accordion-toggle]').first();
    await expect(accordionToggle).toBeVisible();
    await accordionToggle.click();

    const collectionsAcc = drawer.locator('#WmMCollections');
    await expect(collectionsAcc).toHaveClass(/is-open/);

    // 3. Verify collection names are listed with All Products at the top
    const sublinks = collectionsAcc.locator('.wm-mnav__sublink');
    const sublinksCount = await sublinks.count();
    expect(sublinksCount).toBeGreaterThanOrEqual(5);

    const firstSublink = sublinks.first();
    expect(await firstSublink.textContent()).toContain('All Products');

    // Verify exact collection titles are listed
    await expect(collectionsAcc).toContainText('Pet Grooming & Care');
    await expect(collectionsAcc).toContainText('Pet Feeding & Watering');
    await expect(collectionsAcc).toContainText('Pet Food & Treats');
    await expect(collectionsAcc).toContainText('Pet Collars, Leashes & Walking');

    // 4. STRICT REQUIREMENT: Mobile drawer contains NO product cards
    const mobileProductCards = collectionsAcc.locator('[data-product-card], .wm-mega-product-card, .wm-card, img[src*="catalog"]');
    await expect(mobileProductCards).toHaveCount(0);
  });

  test('3. Live Storefront: Desktop navbar Products mega menu has All Products at the top', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('http://127.0.0.1:9292/');

    const trigger = page.locator('#WmTriggerCollections, [data-panel-trigger="collections"]').first();
    await expect(trigger).toBeVisible();

    const megaPanel = page.locator('#WmPanelCollections, [data-panel="collections"]');
    await trigger.hover();
    await expect(megaPanel).toHaveClass(/is-open/);

    const collectionTabs = megaPanel.locator('[data-mega-tab]');
    const firstTab = collectionTabs.first();
    await expect(firstTab).toBeVisible();
    await expect(firstTab).toHaveClass(/is-active/);
    expect(await firstTab.textContent()).toContain('All Products');
    expect(await firstTab.getAttribute('data-mega-tab')).toBe('all-products');

    const allProductsPanel = megaPanel.locator('[data-mega-panel="all-products"]');
    await expect(allProductsPanel).toBeVisible();
    await expect(allProductsPanel).toHaveClass(/is-active/);
  });
});

