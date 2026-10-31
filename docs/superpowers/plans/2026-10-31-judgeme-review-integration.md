# Judge.me Review Form Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the custom product reviews modal to the official Judge.me API (`https://api.judge.me/api/v1/reviews`) with full client-side validation and email support so customer submissions automatically appear in the Shopify Judge.me dashboard.

**Architecture:** Add product metadata (`data-product-id`, `data-shop-domain`) and an Email field to the review modal in `sections/product-tabs.liquid`. Update the review controller in `assets/product.js` to validate the email and dispatch an asynchronous POST request to Judge.me's public review endpoint upon submission, falling back to local optimistic updates for immediate UI feedback.

**Tech Stack:** Shopify Liquid, Vanilla JavaScript (ES6+ Fetch API), Judge.me REST API v1, Vanilla CSS, Playwright (Testing).

## Global Constraints

- **Connected Store:** `gk2scz-zu.myshopify.com`
- **Development Theme ID:** `#159000527020` (`Development (4c28a4-Dishant)`)
- **Published Live Theme ID:** `#158971429036` (`wagmart`)
- Never push directly to live theme `#158971429036`.
- Never upload theme changes (`shopify theme push`) without explicit user approval.
- Maintain existing styles and responsive behavior of the review modal.

---

### Task 1: Add Product Metadata and Email Field to `sections/product-tabs.liquid`

**Files:**
- Modify: `sections/product-tabs.liquid:38-44` (add `data-product-id` and `data-shop-domain`)
- Modify: `sections/product-tabs.liquid:620-635` (add email field in review form modal)
- Test: `tests/test-product-tabs-markup.js`

**Interfaces:**
- Produces: `data-product-id="{{ product.id }}"` and `data-shop-domain="{{ shop.permanent_domain }}"` on `#ProductTabs-{{ section.id }}`
- Produces: `<input type="email" name="email" id="ModalEmail-{{ section.id }}">` with error container `<span data-field-error="email">`

- [x] **Step 1: Write the verification test for product metadata and email field**

```javascript
// tests/test-product-tabs-markup.js
const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:9292/products/pet-grooming-glove', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  const tabsSection = page.locator('[data-product-tabs]');
  const productId = await tabsSection.getAttribute('data-product-id');
  const shopDomain = await tabsSection.getAttribute('data-shop-domain');
  const emailInput = page.locator('[data-review-form] input[name="email"]');
  const emailError = page.locator('[data-field-error="email"]');

  console.log('Product ID:', productId);
  console.log('Shop Domain:', shopDomain);
  console.log('Email Input exists:', (await emailInput.count()) > 0);
  console.log('Email Error exists:', (await emailError.count()) > 0);

  if (!productId || !shopDomain || (await emailInput.count()) === 0 || (await emailError.count()) === 0) {
    process.exit(1);
  }
  await browser.close();
})();
```

- [x] **Step 2: Run test to verify it fails initially**

Run: `node tests/test-product-tabs-markup.js`
Expected: FAIL (exit code 1, missing `data-product-id`, `data-shop-domain`, and `email` input)

- [x] **Step 3: Update `sections/product-tabs.liquid`**

1. In `sections/product-tabs.liquid` lines 38-44:
```liquid
<section
  class="wm-section wm-tabs-section"
  id="ProductTabs-{{ section.id }}"
  data-product-tabs
  data-product-id="{{ product.id }}"
  data-shop-domain="{{ shop.permanent_domain }}"
  data-product-handle="{{ product.handle }}"
  data-product-title="{{ product.title | escape }}"
  data-server-rating="{{ rating_val }}"
  data-server-count="{{ rating_count }}"
>
```

2. In `sections/product-tabs.liquid` right after the Last Name field and before Review Headline:
```liquid
              <div class="wm-review-form__field">
                <label for="ModalEmail-{{ section.id }}" class="wm-review-form__label">
                  Email Address <span class="wm-review-form__req" aria-hidden="true">*</span>
                </label>
                <input
                  type="email"
                  id="ModalEmail-{{ section.id }}"
                  name="email"
                  autocomplete="email"
                  class="wm-review-form__input"
                  placeholder="you@example.com"
                  required
                >
                <span class="wm-review-form__field-error" data-field-error="email" hidden>Please enter a valid email address</span>
                <p class="wm-review-form__hint" style="font-size: 12px; color: #6b7280; margin-top: 4px; margin-bottom: 0;">
                  Required by Judge.me to verify your review. We never spam.
                </p>
              </div>
```

- [x] **Step 4: Run test to verify it passes**

Run: `node tests/test-product-tabs-markup.js`
Expected: PASS (exit code 0, outputs valid Product ID, Shop Domain, and input presence)

- [x] **Step 5: Clean up markup test file and commit**

```bash
git add sections/product-tabs.liquid
git commit -m "feat(reviews): add product-id, shop-domain and email field for Judge.me"
```

---

### Task 2: Implement Real-Time Validation and Judge.me API Submission in `assets/product.js`

**Files:**
- Modify: `assets/product.js:1570-1600` (resetForm clearing email input and errors)
- Modify: `assets/product.js:1955-2060` (email input listener, email regex validation, and `fetch('https://api.judge.me/api/v1/reviews')`)
- Test: `tests/test-judgeme-submission.js`

**Interfaces:**
- Consumes: `tabsSection.dataset.productId`, `tabsSection.dataset.shopDomain`
- Consumes: Form fields `first_name`, `last_name`, `email`, `rating`, `title`, `body`
- Produces: POST request to `https://api.judge.me/api/v1/reviews` with body:
  ```json
  {
    "shop_domain": "gk2scz-zu.myshopify.com",
    "platform": "shopify",
    "id": "8341908422892",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "rating": 5,
    "title": "Loved it!",
    "body": "Gentle on pets."
  }
  ```

- [x] **Step 1: Write integration test for Judge.me submission**

```javascript
// tests/test-judgeme-submission.js
const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  let judgemeRequestPayload = null;
  await page.route('https://api.judge.me/api/v1/reviews', async (route) => {
    judgemeRequestPayload = JSON.parse(route.request().postData());
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Review is being processed in background.' })
    });
  });

  await page.goto('http://127.0.0.1:9292/products/pet-grooming-glove', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  // Activate reviews tab and open modal
  await page.locator('[data-tab-trigger="reviews"]').click();
  await page.waitForTimeout(200);
  await page.locator('[data-review-modal-trigger]').first().click();
  await page.waitForTimeout(300);

  // Fill in form with email
  await page.fill('[name="first_name"]', 'Aarav');
  await page.fill('[name="last_name"]', 'Sharma');
  await page.fill('[name="email"]', 'aarav.sharma@example.com');
  await page.fill('[name="title"]', 'Outstanding Grooming Glove');
  await page.fill('[name="body"]', 'My dog enjoyed it so much! Easy to peel the fur right off.');

  // Submit form
  await page.click('[data-review-submit-btn]');
  await page.waitForTimeout(800);

  console.log('Intercepted Judge.me payload:', judgemeRequestPayload);

  if (!judgemeRequestPayload || 
      judgemeRequestPayload.email !== 'aarav.sharma@example.com' ||
      judgemeRequestPayload.name !== 'Aarav Sharma' ||
      !judgemeRequestPayload.id ||
      !judgemeRequestPayload.shop_domain) {
    console.error('Payload validation failed');
    process.exit(1);
  }

  // Check success banner
  const banner = page.locator('[data-review-status-banner]');
  const isVisible = await banner.isVisible();
  const text = await banner.textContent();
  console.log('Status banner visible:', isVisible, 'Text:', text);

  if (!isVisible) {
    process.exit(1);
  }

  await browser.close();
})();
```

- [x] **Step 2: Run test to verify it fails initially**

Run: `node tests/test-judgeme-submission.js`
Expected: FAIL (exit code 1, no request sent to Judge.me)

- [x] **Step 3: Update `assets/product.js` with email validation and Judge.me POST request**

1. In `resetForm()` in `assets/product.js`:
Ensure email field and `[data-field-error="email"]` are properly reset alongside existing fields.

2. In `reviewForm.addEventListener('input', ...)` in `assets/product.js`:
Add real-time error clearing for `email`:
```javascript
if (name === 'email') {
  const val = target.value.trim();
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  if (isValidEmail) {
    target.classList.remove('has-error');
    target.removeAttribute('aria-invalid');
    const err = reviewForm.querySelector('[data-field-error="email"]');
    if (err) err.hidden = true;
  }
}
```

3. In `reviewForm.addEventListener('submit', async (e) => ...)`:
Add email validation:
```javascript
const email = String(fd.get('email') || '').trim();
const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const fieldsToValidate = [
  { name: 'first_name', val: firstName, el: reviewForm.querySelector('[name="first_name"]') },
  { name: 'last_name', val: lastName, el: reviewForm.querySelector('[name="last_name"]') },
  { name: 'email', val: isEmailValid, el: reviewForm.querySelector('[name="email"]') },
  { name: 'title', val: title, el: reviewForm.querySelector('[name="title"]') },
  { name: 'body', val: body, el: reviewForm.querySelector('[name="body"]') }
];
```

4. In the submission logic, dispatch POST to Judge.me API:
```javascript
const productId = tabsSection.dataset.productId || '';
const shopDomain = tabsSection.dataset.shopDomain || window.Shopify?.shop || 'gk2scz-zu.myshopify.com';

// 1. Post directly to Judge.me API v1
try {
  await fetch('https://api.judge.me/api/v1/reviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      shop_domain: shopDomain,
      platform: 'shopify',
      id: productId,
      name: author,
      email: email,
      rating: rating,
      title: title,
      body: body
    })
  });
} catch (err) {
  console.warn('[Judge.me] Review background sync error:', err);
}

// 2. Optimistic UI update so customer sees their review instantly
saveCustomerReview(newReview);
```

- [x] **Step 4: Run integration test to verify it passes**

Run: `node tests/test-judgeme-submission.js`
Expected: PASS (exit code 0, payload correctly matches Judge.me specification and banner displays)

- [x] **Step 5: Clean up test files and commit**

```bash
git add assets/product.js
git commit -m "feat(reviews): dispatch review submissions to Judge.me API"
```

---

### Task 3: Comprehensive End-to-End Verification & Theme Check

**Files:**
- Modify: None (Verification only)
- Test: `npm run theme:check`

- [x] **Step 1: Run theme check**

Run: `npm run theme:check`
Expected: 0 errors across the repository

- [x] **Step 2: Clean up any temporary test scripts**

Run: `Remove-Item -Path "tests/test-product-tabs-markup.js", "tests/test-judgeme-submission.js" -ErrorAction SilentlyContinue`

- [x] **Step 3: Verification on local preview**

Verify on `http://127.0.0.1:9292/products/pet-grooming-glove`:
1. Modal opens smoothly with clean Email field.
2. Form validates empty email and invalid email format.
3. Submitting valid form sends data to Judge.me and displays confirmation banner.

---
