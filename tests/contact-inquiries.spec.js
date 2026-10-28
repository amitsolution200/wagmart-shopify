const { test, expect } = require('@playwright/test');
const { createApp } = require('../server/app');
const { InquiryDatabase } = require('../server/db');
const { RateLimiter, AuthManager } = require('../server/security');
const { InquiryMailer } = require('../server/mailer');

const BACKEND_PORT = 3001;
const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;
const CONTACT_PAGE_URL = `${BACKEND_URL}/pages/contact`;

let serverInstance = null;
let testApp = null;
let testDb = null;
let testMailer = null;
let testRateLimiter = null;
let testAuthManager = null;

test.beforeAll(async () => {
  // Use in-memory SQLite for clean test isolation
  testDb = new InquiryDatabase(':memory:');
  testMailer = new InquiryMailer();
  testRateLimiter = new RateLimiter(15 * 60 * 1000, 5);
  testAuthManager = new AuthManager();

  testApp = createApp({
    db: testDb,
    mailer: testMailer,
    rateLimiter: testRateLimiter,
    authManager: testAuthManager,
  });

  await new Promise((resolve) => {
    serverInstance = testApp.app.listen(BACKEND_PORT, () => {
      resolve();
    });
  });
});

test.afterAll(async () => {
  if (serverInstance) {
    await new Promise((resolve) => serverInstance.close(resolve));
  }
  if (testDb) {
    testDb.close();
  }
});

test.beforeEach(() => {
  // Reset rate limiter and mock emails between tests
  testRateLimiter.reset();
  testMailer.clearMockSentEmails();
  testApp.setSimulateDbFailure(false);
  testApp.setSimulateEmailFailure(false);
});

test.describe('Wagmart Contact Inquiries & Notification System', () => {

  // =========================================================================
  // TEST 1: Valid Submission
  // =========================================================================
  test('1. Valid submission persists to database, returns unique reference, and queues notification email', async ({ page }) => {
    await page.goto(CONTACT_PAGE_URL);

    // Fill the contact form
    await page.fill('#WagmartFormName', 'Sarah Jenkins');
    await page.fill('#WagmartFormEmail', 'sarah.jenkins@example.com');
    await page.fill('#WagmartFormOrder', '#WM-98421');
    await page.selectOption('#WagmartFormTopic', 'Product Advice & Sizing');
    await page.fill('#WagmartFormMessage', 'What is the recommended harness size for a 22kg Australian Shepherd?');

    // Submit form
    await page.click('#WagmartFormSubmit');

    // Verify feedback alert appears with reference ID
    const alertBox = page.locator('#WagmartFormAlert');
    await expect(alertBox).toBeVisible({ timeout: 5000 });
    const alertText = await alertBox.textContent();
    expect(alertText).toContain('Inquiry Received');
    expect(alertText).toContain('WAG-INQ-');

    // Verify toast is visible
    const toast = page.locator('#wm-contact-toast');
    await expect(toast).toHaveClass(/is-visible/);

    // Verify persistence in SQLite database
    const inquiries = testDb.listInquiries({ search: 'sarah.jenkins@example.com' });
    expect(inquiries.total).toBe(1);
    const inq = inquiries.inquiries[0];
    expect(inq.name).toBe('Sarah Jenkins');
    expect(inq.email).toBe('sarah.jenkins@example.com');
    expect(inq.order_number).toBe('#WM-98421');
    expect(inq.topic).toBe('Product Advice & Sizing');
    expect(inq.status).toBe('New');
    expect(inq.email_delivery_status).toBe('mock_delivered');

    // Verify mock email was dispatched with customer Reply-To
    const sentEmails = testMailer.getMockSentEmails();
    expect(sentEmails.length).toBe(1);
    const email = sentEmails[0];
    expect(email.subject).toContain(inq.reference);
    expect(email.replyTo).toContain('sarah.jenkins@example.com');
    expect(email.text).toContain('What is the recommended harness size');
  });

  // =========================================================================
  // TEST 2: Missing or Invalid Fields
  // =========================================================================
  test('2. Missing or invalid fields trigger validation errors and do not save to database', async ({ request, page }) => {
    // 2a. Client-side validation: missing required field
    await page.goto(CONTACT_PAGE_URL);
    await page.fill('#WagmartFormName', 'John');
    // Leave email, topic, message blank
    await page.click('#WagmartFormSubmit');

    // Form alert should not appear because HTML5 / JS validation halted submission
    const alertBox = page.locator('#WagmartFormAlert');
    await expect(alertBox).toBeHidden();

    // 2b. Server-side validation check directly against API
    const response = await request.post(`${BACKEND_URL}/api/contact`, {
      data: {
        name: 'A', // too short (< 2)
        email: 'invalid-email-address',
        topic: 'Non-Existent Topic',
        message: 'short', // too short (< 10)
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.errors).toBeDefined();
    expect(body.errors.name).toContain('at least 2 characters');
    expect(body.errors.email).toContain('valid email address');
    expect(body.errors.topic).toContain('valid topic');
    expect(body.errors.message).toContain('at least 10 characters');

    // Verify nothing saved in database
    const count = testDb.listInquiries({ search: 'invalid-email-address' }).total;
    expect(count).toBe(0);
  });

  // =========================================================================
  // TEST 3: Duplicate Clicks / Rapid Double Submission
  // =========================================================================
  test('3. Duplicate clicks within 60s return existing reference without duplicate database row or extra email', async ({ request }) => {
    const payload = {
      name: 'Michael Brown',
      email: 'michael.brown@example.com',
      order_number: '#WM-77612',
      topic: 'Order Tracking & Shipping',
      message: 'Where is my order? The tracking link has not updated in 2 days.',
    };

    // First submission
    const res1 = await request.post(`${BACKEND_URL}/api/contact`, { data: payload });
    expect(res1.status()).toBe(200);
    const data1 = await res1.json();
    expect(data1.success).toBe(true);
    const ref1 = data1.reference;

    // Immediate second submission (e.g. accidental double-click)
    const res2 = await request.post(`${BACKEND_URL}/api/contact`, { data: payload });
    expect(res2.status()).toBe(200);
    const data2 = await res2.json();
    expect(data2.success).toBe(true);
    expect(data2.isDuplicate).toBe(true);
    expect(data2.reference).toBe(ref1); // Same reference returned!

    // Verify database only has 1 record
    const list = testDb.listInquiries({ search: 'michael.brown@example.com' });
    expect(list.total).toBe(1);

    // Verify only 1 email was queued
    const sentEmails = testMailer.getMockSentEmails();
    expect(sentEmails.length).toBe(1);
  });

  // =========================================================================
  // TEST 4: Spam Protection (Honeypot & Rate Limiting)
  // =========================================================================
  test('4. Spam honeypot rejects automated bots and rate limiter blocks rapid abuse (>5 requests)', async ({ request }) => {
    // 4a. Honeypot check
    const spamRes = await request.post(`${BACKEND_URL}/api/contact`, {
      data: {
        name: 'Spam Bot',
        email: 'spambot@example.com',
        topic: 'Other Inquiries',
        message: 'Buy cheap watches and crypto at spam-website.xyz today!',
        hp_website: 'http://spam-link.xyz', // bot filled the hidden honeypot
      },
    });

    expect(spamRes.status()).toBe(400);
    const spamData = await spamRes.json();
    expect(spamData.success).toBe(false);
    expect(spamData.error).toContain('Automated submission rejected');

    // 4b. Rate Limiting: Send 5 valid submissions, 6th should be HTTP 429
    for (let i = 1; i <= 5; i++) {
      const res = await request.post(`${BACKEND_URL}/api/contact`, {
        data: {
          name: `User ${i}`,
          email: `user${i}@example.com`,
          topic: 'Returns & Exchanges',
          message: `Inquiry message test number ${i} requesting return information.`,
        },
      });
      expect(res.status()).toBe(200);
    }

    // 6th request from same IP
    const rateLimitedRes = await request.post(`${BACKEND_URL}/api/contact`, {
      data: {
        name: 'User 6',
        email: 'user6@example.com',
        topic: 'Returns & Exchanges',
        message: 'This sixth request exceeds the 5-request rate limit.',
      },
    });

    expect(rateLimitedRes.status()).toBe(429);
    const rateData = await rateLimitedRes.json();
    expect(rateData.success).toBe(false);
    expect(rateData.error).toContain('Too many submissions');
  });

  // =========================================================================
  // TEST 5: Database Failure Handling
  // =========================================================================
  test('5. Database failure returns 500 error and never falsely reports success', async ({ request }) => {
    testApp.setSimulateDbFailure(true);

    const res = await request.post(`${BACKEND_URL}/api/contact`, {
      data: {
        name: 'Emma Watson',
        email: 'emma@example.com',
        topic: 'Product Advice & Sizing',
        message: 'Testing behavior when database connection fails temporarily.',
      },
    });

    expect(res.status()).toBe(500);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('unable to save your inquiry');
    expect(data.reference).toBeUndefined();

    // Verify no email was dispatched
    expect(testMailer.getMockSentEmails().length).toBe(0);
  });

  // =========================================================================
  // TEST 6: Email Failure Handling & Retry Mechanism
  // =========================================================================
  test('6. Email failure retains inquiry in database with status failed and allows safe retry', async ({ request }) => {
    testApp.setSimulateEmailFailure(true);

    const res = await request.post(`${BACKEND_URL}/api/contact`, {
      data: {
        name: 'David Miller',
        email: 'david.miller@example.com',
        topic: 'Grooming & Hygiene Care',
        message: 'My dog has sensitive skin, which shampoo ingredients should I avoid?',
      },
    });

    // Inquiry is safely saved even though email failed
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.emailDeliveryStatus).toBe('failed');
    expect(data.reference).toBeDefined();

    // Verify in database: status is 'New', email_delivery_status is 'failed'
    const inq = testDb.getInquiryByReference(data.reference);
    expect(inq).toBeDefined();
    expect(inq.status).toBe('New');
    expect(inq.email_delivery_status).toBe('failed');
    expect(inq.email_error).toContain('SIMULATED_EMAIL_FAILURE');

    // Now simulate mail server restored and trigger retry endpoint
    testApp.setSimulateEmailFailure(false);
    const adminKey = testAuthManager.getAdminApiKey();

    const retryRes = await request.post(`${BACKEND_URL}/api/admin/inquiries/${inq.id}/retry-email`, {
      headers: {
        Authorization: `Bearer ${adminKey}`,
      },
    });

    expect(retryRes.status()).toBe(200);
    const retryData = await retryRes.json();
    expect(retryData.success).toBe(true);
    expect(retryData.deliveryStatus).toBe('mock_delivered');

    // Verify updated status in database
    const updatedInq = testDb.getInquiryById(inq.id);
    expect(updatedInq.email_delivery_status).toBe('mock_delivered');
    expect(testDb.getRetryLogs(inq.id).length).toBe(2); // 1 initial fail + 1 retry success
  });

  // =========================================================================
  // TEST 7: Unauthorized Dashboard Access & Security
  // =========================================================================
  test('7. Admin dashboard and API require server-side authentication (401 / redirect)', async ({ request, page }) => {
    // 7a. Unauthenticated API call returns 401
    const apiRes = await request.get(`${BACKEND_URL}/api/admin/inquiries`);
    expect(apiRes.status()).toBe(401);
    const apiBody = await apiRes.json();
    expect(apiBody.success).toBe(false);
    expect(apiBody.error).toContain('UNAUTHORIZED');

    // 7b. Unauthenticated browser access redirects to /admin/login
    await page.goto(`${BACKEND_URL}/admin/inquiries`);
    await expect(page).toHaveURL(`${BACKEND_URL}/admin/login`);
    await expect(page.locator('h1')).toHaveText('Inquiry Management');

    // 7c. Submitting invalid password shows error
    await page.fill('#adminPassword', 'wrong_password_123');
    await page.click('button[type="submit"]');
    await expect(page.locator('.wm-error')).toBeVisible();

    // 7d. Submitting correct password logs in and displays inquiries dashboard
    await page.fill('#adminPassword', testAuthManager.getAdminPassword());
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(`${BACKEND_URL}/admin/inquiries`);
    await expect(page.locator('.wm-brand-title')).toHaveText('Wagmart Support Admin');

    // 7e. Authenticated API call with Bearer token succeeds
    const authApiRes = await request.get(`${BACKEND_URL}/api/admin/inquiries`, {
      headers: {
        Authorization: `Bearer ${testAuthManager.getAdminApiKey()}`,
      },
    });
    expect(authApiRes.status()).toBe(200);
    const authData = await authApiRes.json();
    expect(authData.success).toBe(true);
    expect(authData.metrics).toBeDefined();
  });

  // =========================================================================
  // TEST 8: Mobile Layout & Responsiveness
  // =========================================================================
  test('8. Contact form and Admin Dashboard are fully functional on mobile viewport (375x667)', async ({ page }) => {
    // 8a. Test Contact page on mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(CONTACT_PAGE_URL);

    const nameField = page.locator('#WagmartFormName');
    const submitBtn = page.locator('#WagmartFormSubmit');
    await expect(nameField).toBeVisible();
    await expect(submitBtn).toBeVisible();

    // Verify inputs do not overflow horizontally
    const formBox = await page.locator('.wagmart-form-card').boundingBox();
    expect(formBox.width).toBeLessThanOrEqual(375);

    // 8b. Test Admin Dashboard on mobile
    const adminKey = testAuthManager.getAdminApiKey();
    // Set cookie on browser context to access dashboard directly
    const sessionToken = testAuthManager.createSession();
    await page.context().addCookies([
      {
        name: 'wagmart_admin_session',
        value: sessionToken,
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto(`${BACKEND_URL}/admin/inquiries`);
    await expect(page.locator('.wm-brand-title')).toBeVisible();
    const metricsGrid = page.locator('.wm-metrics-grid');
    await expect(metricsGrid).toBeVisible();
  });

  // =========================================================================
  // TEST 9: Local vs Production Configuration Differences
  // =========================================================================
  test('9. Local mock mailer does not send real external emails and configuration environment is verified', async () => {
    // In local development, MAIL_MOCK is active by default
    expect(testMailer.isMockMode()).toBe(true);

    // Recipient email is safely configurable
    expect(testMailer.getNotificationRecipient()).toBeDefined();

    // From address is safely configurable
    expect(testMailer.getFromAddress()).toContain('Wagmart');
  });

});
