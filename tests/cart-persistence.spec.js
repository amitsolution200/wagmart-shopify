// @ts-check
const { test, expect } = require('@playwright/test');
const http = require('http');
const fs = require('fs');
const path = require('path');

let server;
let baseUrl;

// Simulated Shopify backend session cart
let backendCart = {
  token: 'mock-cart-token-12345',
  item_count: 1,
  total_price: 39900,
  items: [
    {
      id: 47717959139500,
      key: '47717959139500:4816cfbc68735235882415c9a0fe0b77',
      variant_id: 47717959139500,
      product_id: 9636480155820,
      title: 'Wagmart Pet Grooming Brush',
      product_title: 'Wagmart Pet Grooming Brush',
      variant_title: 'Default Title',
      price: 39900,
      final_price: 39900,
      original_line_price: 39900,
      final_line_price: 39900,
      quantity: 1,
      image: '/catalog-bath-massage-brush.webp',
      url: '/products/wagmart-pet-grooming-brush'
    }
  ]
};

function resetBackendCart() {
  backendCart = {
    token: 'mock-cart-token-12345',
    item_count: 1,
    total_price: 39900,
    items: [
      {
        id: 47717959139500,
        key: '47717959139500:4816cfbc68735235882415c9a0fe0b77',
        variant_id: 47717959139500,
        product_id: 9636480155820,
        title: 'Wagmart Pet Grooming Brush',
        product_title: 'Wagmart Pet Grooming Brush',
        variant_title: 'Default Title',
        price: 39900,
        final_price: 39900,
        original_line_price: 39900,
        final_line_price: 39900,
        quantity: 1,
        image: '/catalog-bath-massage-brush.webp',
        url: '/products/wagmart-pet-grooming-brush'
      }
    ]
  };
}

function recalcBackendCart() {
  backendCart.item_count = backendCart.items.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0);
  backendCart.total_price = backendCart.items.reduce(
    (acc, i) => acc + (Number(i.final_price) || Number(i.price) || 0) * (Number(i.quantity) || 0),
    0
  );
}

function generatePageHtml() {
  const themeJs = fs.readFileSync(path.join(__dirname, '..', 'assets', 'theme.js'), 'utf8');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Wagmart Cart Persistence Test</title>
  <style>
    .hidden { display: none !important; }
    .wm-line { display: flex; justify-content: space-between; padding: 12px; margin-bottom: 8px; border: 1px solid #eee; }
    .is-loading { opacity: 0.6; pointer-events: none; }
  </style>
</head>
<body>
  <!-- Header Cart Trigger -->
  <header>
    <button type="button" data-open-cart id="header-cart-btn">
      Cart (<span data-cart-count id="header-cart-count">${backendCart.item_count}</span>)
    </button>
  </header>

  <!-- Product Card On Page -->
  <main>
    <div
      class="wm-card"
      data-product-card
      data-product-id="47717959139500"
      data-product-name="Wagmart Pet Grooming Brush"
      data-product-price="399"
      data-product-original-price="549"
      data-product-image="/catalog-bath-massage-brush.webp"
      data-product-url="/products/wagmart-pet-grooming-brush"
    >
      <h3>Wagmart Pet Grooming Brush</h3>
      <p class="wm-card__price">₹399</p>

      <button
        type="button"
        data-add-to-cart
        class="${backendCart.item_count > 0 ? 'hidden' : ''}"
      >
        Add to Cart
      </button>

      <div
        data-card-stepper
        class="wm-card-stepper ${backendCart.item_count > 0 ? '' : 'hidden'}"
      >
        <button type="button" data-card-stepper-btn data-delta="-1" aria-label="Decrease quantity">-</button>
        <span data-card-qty>${backendCart.items[0]?.quantity || 1}</span>
        <button type="button" data-card-stepper-btn data-delta="1" aria-label="Increase quantity">+</button>
      </div>
    </div>
  </main>

  <!-- Cart Drawer -->
  <div class="wm-cart" id="cart-drawer" aria-hidden="true" data-cart-drawer>
    <div class="wm-cart__panel">
      <div class="wm-cart__head">
        <h2>Your Cart (<span data-cart-total-qty id="cart-drawer-total-qty">${backendCart.item_count}</span>)</h2>
        <button type="button" data-close-cart>Close</button>
      </div>

      <div class="wm-cart__body">
        <p data-cart-notice></p>
        <div id="cart-drawer-empty" class="${backendCart.items.length === 0 ? '' : 'hidden'}">
          <h3>Your cart is empty</h3>
        </div>
        <ul id="cart-drawer-items" class="${backendCart.items.length === 0 ? 'hidden' : ''}">
          ${backendCart.items.map(item => `
            <li class="wm-line" data-cart-item-id="${item.key}">
              <div>
                <strong>${item.title}</strong>
                <p>₹${item.price / 100} each</p>
                <div class="wm-qty">
                  <button type="button" data-cart-qty-btn="-1" data-key="${item.key}">-</button>
                  <output>${item.quantity}</output>
                  <button type="button" data-cart-qty-btn="1" data-key="${item.key}">+</button>
                </div>
                <button type="button" data-cart-remove="${item.key}">Remove</button>
              </div>
              <p>₹${(item.final_line_price || item.price * item.quantity) / 100}</p>
            </li>
          `).join('')}
        </ul>
      </div>

      <div id="cart-drawer-footer" class="${backendCart.items.length === 0 ? 'hidden' : ''}">
        <div>
          <span>Subtotal</span>
          <strong id="cart-drawer-subtotal">₹${backendCart.total_price / 100}</strong>
        </div>
        <form action="/checkout" method="get" id="cart-drawer-form">
          <button type="submit" name="checkout" class="wm-btn wm-btn--primary">
            Checkout
          </button>
        </form>
      </div>
    </div>
  </div>

  <script>
    ${themeJs}
  </script>
</body>
</html>`;
}

test.beforeAll(async () => {
  server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');

    // GET / (Home Page)
    if (url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(generatePageHtml());
      return;
    }

    // GET /cart.js
    if (url.pathname === '/cart.js') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(backendCart));
      return;
    }

    // POST /cart/add.js
    if (url.pathname === '/cart/add.js' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        const payload = JSON.parse(body || '{}');
        const variantId = Number(payload.id);
        const qty = Number(payload.quantity) || 1;

        let existing = backendCart.items.find(i => Number(i.id) === variantId);
        if (existing) {
          existing.quantity += qty;
          existing.final_line_price = existing.price * existing.quantity;
        } else {
          backendCart.items.push({
            id: variantId,
            key: variantId + ':mockhash123',
            variant_id: variantId,
            product_id: 9636480155820,
            title: 'Wagmart Pet Grooming Brush',
            product_title: 'Wagmart Pet Grooming Brush',
            variant_title: 'Default Title',
            price: 39900,
            final_price: 39900,
            original_line_price: 39900 * qty,
            final_line_price: 39900 * qty,
            quantity: qty,
            image: '/catalog-bath-massage-brush.webp',
            url: '/products/wagmart-pet-grooming-brush'
          });
        }
        recalcBackendCart();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(backendCart.items[backendCart.items.length - 1]));
      });
      return;
    }

    // POST /cart/change.js
    if (url.pathname === '/cart/change.js' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        const payload = JSON.parse(body || '{}');
        const changeId = String(payload.id);
        const quantity = Number(payload.quantity);

        const index = backendCart.items.findIndex(
          i => String(i.key) === changeId || String(i.id) === changeId || (i.variant_id && String(i.variant_id) === changeId)
        );

        if (index > -1) {
          if (quantity <= 0) {
            backendCart.items.splice(index, 1);
          } else {
            backendCart.items[index].quantity = quantity;
            backendCart.items[index].final_line_price = backendCart.items[index].price * quantity;
          }
        }
        recalcBackendCart();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(backendCart));
      });
      return;
    }

    // GET /checkout (Checkout landing page displaying final backend quantities)
    if (url.pathname === '/checkout') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      const itemsList = backendCart.items.map(i =>
        `<div data-checkout-item data-item-id="${i.id}" data-item-qty="${i.quantity}">
          <span>${i.title}</span> - Qty: <strong id="checkout-item-qty">${i.quantity}</strong>
         </div>`
      ).join('');

      res.end(`<!DOCTYPE html>
        <html>
        <head><title>Checkout</title></head>
        <body>
          <h1>Shopify Checkout</h1>
          <div id="checkout-items">${itemsList || '<p id="empty-checkout">Cart is empty</p>'}</div>
          <div id="checkout-total-items">${backendCart.item_count}</div>
        </body>
        </html>`);
      return;
    }

    res.writeHead(404);
    res.end('Not found');
  });

  await new Promise(resolve => {
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });
});

test.afterAll(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
});

test.beforeEach(() => {
  resetBackendCart();
});

test.describe('Cart Quantity & Removal Persistence with Server Sync', () => {

  test('1. In Cart Drawer: increasing quantity from 1 to 2 updates server and shows 2 at checkout', async ({ page }) => {
    await page.goto(baseUrl + '/');

    // Verify initial drawer item quantity is 1
    const qtyOutput = page.locator('#cart-drawer-items output');
    await expect(qtyOutput).toHaveText('1');

    // Click "+" button in drawer (uses line key like "47717959139500:4816cfbc68735235882415c9a0fe0b77")
    const plusBtn = page.locator('[data-cart-qty-btn="1"]');
    await plusBtn.click();

    // Verify drawer updates to 2
    await expect(qtyOutput).toHaveText('2');
    await expect(page.locator('#cart-drawer-total-qty')).toHaveText('2');

    // Click "Checkout" in drawer
    const checkoutBtn = page.locator('#cart-drawer-form button[type="submit"]');
    await checkoutBtn.click();

    // Verify Checkout landing page receives quantity 2, NOT 1!
    await page.waitForURL('**/checkout*');
    const checkoutQty = page.locator('#checkout-item-qty');
    await expect(checkoutQty).toHaveText('2');
    await expect(page.locator('#checkout-total-items')).toHaveText('2');
  });

  test('2. In Cart Drawer: removing item and refreshing page does NOT bring it back', async ({ page }) => {
    await page.goto(baseUrl + '/');

    // Verify item is currently in drawer
    await expect(page.locator('#cart-drawer-items .wm-line')).toHaveCount(1);
    await expect(page.locator('#cart-drawer-empty')).toHaveClass(/hidden/);

    // Click "Remove" button in drawer (uses line key)
    const removeBtn = page.locator('[data-cart-remove]');
    await removeBtn.click();

    // Drawer should show empty state
    await expect(page.locator('#cart-drawer-empty')).not.toHaveClass(/hidden/);
    await expect(page.locator('#cart-drawer-items')).toHaveClass(/hidden/);
    await expect(page.locator('#cart-drawer-total-qty')).toHaveText('0');

    // Refresh the page
    await page.reload();

    // The removed item must NOT come back!
    await expect(page.locator('#cart-drawer-empty')).not.toHaveClass(/hidden/);
    await expect(page.locator('#cart-drawer-items')).toHaveClass(/hidden/);
    await expect(page.locator('#header-cart-count')).toHaveText('0');
  });

  test('3. On Product Card: decrementing quantity to 0 removes item, and refresh page does NOT bring it back', async ({ page }) => {
    await page.goto(baseUrl + '/');

    // Card stepper is visible with quantity 1
    const cardStepper = page.locator('[data-product-card] [data-card-stepper]');
    const addBtn = page.locator('[data-product-card] [data-add-to-cart]');
    const cardQty = page.locator('[data-product-card] [data-card-qty]');

    await expect(cardStepper).not.toHaveClass(/hidden/);
    await expect(cardQty).toHaveText('1');

    // Click "-" on card stepper to decrement from 1 to 0
    const minusBtn = page.locator('[data-product-card] [data-card-stepper-btn][data-delta="-1"]');
    await minusBtn.click();

    // Card immediately reverts to "Add to Cart" button
    await expect(cardStepper).toHaveClass(/hidden/);
    await expect(addBtn).not.toHaveClass(/hidden/);

    // Wait for server /cart/change.js sync
    await page.waitForTimeout(300);

    // Refresh the page
    await page.reload();

    // Card must stay in "Add to Cart" state and NOT revert back to stepper!
    await expect(page.locator('[data-product-card] [data-card-stepper]')).toHaveClass(/hidden/);
    await expect(page.locator('[data-product-card] [data-add-to-cart]')).not.toHaveClass(/hidden/);
    await expect(page.locator('#header-cart-count')).toHaveText('0');
  });

  test('4. On Product Card: increasing quantity to 3 on card, drawer shows 3 and checkout shows 3', async ({ page }) => {
    await page.goto(baseUrl + '/');

    const plusBtn = page.locator('[data-product-card] [data-card-stepper-btn][data-delta="1"]');
    // Click "+" twice: 1 -> 2 -> 3
    await plusBtn.click();
    await plusBtn.click();

    const cardQty = page.locator('[data-product-card] [data-card-qty]');
    await expect(cardQty).toHaveText('3');

    // Drawer should show 3
    await expect(page.locator('#cart-drawer-total-qty')).toHaveText('3');
    await expect(page.locator('#cart-drawer-items output')).toHaveText('3');

    // Reload page to verify persistence
    await page.reload();

    await expect(page.locator('[data-product-card] [data-card-qty]')).toHaveText('3');
    await expect(page.locator('#header-cart-count')).toHaveText('3');

    // Click checkout
    await page.locator('#cart-drawer-form button[type="submit"]').click();
    await page.waitForURL('**/checkout*');
    await expect(page.locator('#checkout-item-qty')).toHaveText('3');
  });

});
