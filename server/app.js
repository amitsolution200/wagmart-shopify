const express = require('express');
const { InquiryDatabase, DEFAULT_DB_PATH } = require('./db');
const {
  validateInquiryInput,
  RateLimiter,
  AuthManager,
  parseCookies,
  safeLog,
} = require('./security');
const { InquiryMailer } = require('./mailer');
const { renderLoginPage, renderDashboardPage } = require('./dashboard-html');
const { renderContactPageHtml } = require('./contact-page-html');

function createApp(options = {}) {
  const app = express();
  const dbPath = options.dbPath || DEFAULT_DB_PATH;
  const db = options.db || new InquiryDatabase(dbPath);
  const mailer = options.mailer || new InquiryMailer();
  const rateLimiter = options.rateLimiter || new RateLimiter(15 * 60 * 1000, 5);
  const authManager = options.authManager || new AuthManager();

  // Test failure hooks
  let simulateDbFailure = false;
  let simulateEmailFailure = false;

  // Body parsing
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));

  // CORS Middleware for Local Theme Dev (localhost:9292) and Frontends
  app.use((req, res, next) => {
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Api-Key');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // Client IP extractor
  const getClientIp = (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    return req.socket?.remoteAddress || '127.0.0.1';
  };

  // Auth Middleware
  const requireAdminAuth = (req, res, next) => {
    if (authManager.authenticateRequest(req)) {
      return next();
    }

    if (req.path.startsWith('/api/')) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED: Valid Admin credentials or API key required.',
      });
    }

    // Redirect to login page for browser navigation
    return res.redirect('/admin/login');
  };

  // =========================================================================
  // PUBLIC CONTACT FORM SUBMISSION ENDPOINT
  // =========================================================================
  app.post('/api/contact', async (req, res) => {
    const clientIp = getClientIp(req);
    const userAgent = req.headers['user-agent'] || '';

    // Handle payload from either JSON or URL-encoded (Shopify form field names like contact[name])
    const body = req.body || {};
    const rawName = body['contact[name]'] || body.name;
    const rawEmail = body['contact[email]'] || body.email;
    const rawOrder = body['contact[order_number]'] || body.order_number;
    const rawTopic = body['contact[Topic]'] || body['contact[topic]'] || body.topic;
    const rawMessage = body['contact[body]'] || body.message;
    const honeypot = body['contact[hp_website]'] || body.hp_website || body._honey;

    // 1. Spam Honeypot Check
    if (honeypot && String(honeypot).trim().length > 0) {
      safeLog('warn', 'Spam Honeypot Triggered', { ip: clientIp });
      return res.status(400).json({
        success: false,
        error: 'Automated submission rejected.',
      });
    }

    // 2. IP Rate Limiting
    const rateCheck = rateLimiter.check(clientIp);
    if (!rateCheck.isAllowed) {
      safeLog('warn', 'Rate Limit Exceeded', { ip: clientIp, resetInSeconds: rateCheck.resetInSeconds });
      return res.status(429).json({
        success: false,
        error: `Too many submissions from your connection. Please wait ${rateCheck.resetInSeconds} seconds before trying again.`,
        retryAfter: rateCheck.resetInSeconds,
      });
    }

    // 3. Server-side Validation
    const validation = validateInquiryInput({
      name: rawName,
      email: rawEmail,
      order_number: rawOrder,
      topic: rawTopic,
      message: rawMessage,
      hp_website: honeypot,
    });

    if (!validation.isValid) {
      safeLog('info', 'Validation Failed', { errors: validation.errors });
      return res.status(400).json({
        success: false,
        error: 'Validation failed. Please correct the highlighted fields.',
        errors: validation.errors,
      });
    }

    const { sanitized } = validation;

    // 4. Accidental Duplicate / Rapid Click Check (Idempotency)
    const recentDuplicate = db.findRecentDuplicate(sanitized.email, sanitized.topic, sanitized.message, 60);
    if (recentDuplicate) {
      safeLog('info', 'Duplicate Submission Suppressed', {
        reference: recentDuplicate.reference,
        email: recentDuplicate.email,
      });
      return res.status(200).json({
        success: true,
        isDuplicate: true,
        reference: recentDuplicate.reference,
        status: recentDuplicate.status,
        emailDeliveryStatus: recentDuplicate.email_delivery_status,
        message: `Your inquiry has already been received under reference #${recentDuplicate.reference}. Our support team will reply shortly.`,
      });
    }

    // 5. Database Save (Must succeed before claiming success or sending email)
    let inquiry = null;
    try {
      if (simulateDbFailure) {
        throw new Error('DATABASE_CONNECTION_ERROR: Simulated database write failure.');
      }

      inquiry = db.createInquiry({
        name: sanitized.name,
        email: sanitized.email,
        order_number: sanitized.order_number,
        topic: sanitized.topic,
        message: sanitized.message,
        ip_address: clientIp,
        user_agent: userAgent,
      });

      safeLog('info', 'Inquiry Created', {
        reference: inquiry.reference,
        email: inquiry.email,
        topic: inquiry.topic,
      });
    } catch (dbErr) {
      safeLog('error', 'Database Save Failed', { error: dbErr.message });
      return res.status(500).json({
        success: false,
        error: 'We were unable to save your inquiry due to a temporary database issue. Please try again or reach out to us by phone.',
      });
    }

    // 6. Decoupled Email Notification
    let emailSent = false;
    let emailDeliveryStatus = 'pending';
    let emailErrorMsg = null;

    try {
      const emailResult = await mailer.sendInquiryNotification(inquiry, {
        simulateFailure: simulateEmailFailure,
      });
      emailSent = true;
      emailDeliveryStatus = emailResult.mode === 'mock' ? 'mock_delivered' : 'sent';
      db.updateEmailDelivery(inquiry.id, emailDeliveryStatus, null);
    } catch (mailErr) {
      emailSent = false;
      emailDeliveryStatus = 'failed';
      emailErrorMsg = mailErr.message;
      db.updateEmailDelivery(inquiry.id, 'failed', mailErr.message);
      db.logRetryAttempt(inquiry.id, 1, 'failed', mailErr.message);

      safeLog('warn', 'Email Notification Failed After DB Save', {
        reference: inquiry.reference,
        error: mailErr.message,
      });
    }

    // Respond with success and real reference ID
    return res.status(200).json({
      success: true,
      reference: inquiry.reference,
      status: inquiry.status,
      emailSent,
      emailDeliveryStatus,
      message: `Thank you, ${inquiry.name}! Your message has been received. Your reference number is #${inquiry.reference}. We will reply within 24 hours.`,
    });
  });

  // =========================================================================
  // PROTECTED ADMIN API ROUTES
  // =========================================================================
  app.get('/api/admin/inquiries', requireAdminAuth, (req, res) => {
    const { search, status, topic, startDate, endDate, page, limit } = req.query;
    const result = db.listInquiries({ search, status, topic, startDate, endDate, page, limit });
    const metrics = db.getMetrics();
    res.json({ success: true, ...result, metrics });
  });

  app.get('/api/admin/inquiries/:id', requireAdminAuth, (req, res) => {
    const inquiry = db.getInquiryById(req.params.id);
    if (!inquiry) {
      return res.status(404).json({ success: false, error: 'Inquiry not found' });
    }
    const retries = db.getRetryLogs(inquiry.id);
    res.json({ success: true, inquiry, retries });
  });

  app.patch('/api/admin/inquiries/:id/status', requireAdminAuth, (req, res) => {
    const { status } = req.body;
    try {
      const updated = db.updateInquiryStatus(req.params.id, status);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Inquiry not found' });
      }
      safeLog('info', 'Status Updated', { id: updated.id, reference: updated.reference, status: updated.status });
      res.json({ success: true, inquiry: updated });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.post('/api/admin/inquiries/:id/retry-email', requireAdminAuth, async (req, res) => {
    try {
      const retryResult = await mailer.retryInquiryNotification(db, req.params.id);
      res.json(retryResult);
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.get('/api/admin/mock-emails', requireAdminAuth, (req, res) => {
    res.json({
      success: true,
      mode: mailer.isMockMode() ? 'mock' : 'smtp',
      emails: mailer.getMockSentEmails(),
    });
  });

  // =========================================================================
  // STOREFRONT CONTACT PAGE ROUTE (Standalone preview & direct access)
  // =========================================================================
  app.get(['/pages/contact', '/contact'], (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(renderContactPageHtml());
  });

  // =========================================================================
  // PROTECTED ADMIN WEB UI ROUTES
  // =========================================================================
  app.get('/admin/login', (req, res) => {
    if (authManager.authenticateRequest(req)) {
      return res.redirect('/admin/inquiries');
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(renderLoginPage());
  });

  app.post('/admin/login', (req, res) => {
    const { password } = req.body;
    const expectedPassword = authManager.getAdminPassword();
    const expectedApiKey = authManager.getAdminApiKey();

    if (password === expectedPassword || password === expectedApiKey) {
      const sessionToken = authManager.createSession();
      res.setHeader('Set-Cookie', `wagmart_admin_session=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
      return res.redirect('/admin/inquiries');
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(401).send(renderLoginPage('Invalid admin password. Please try again.'));
  });

  app.post('/admin/logout', (req, res) => {
    const cookies = req.headers.cookie ? parseCookies(req.headers.cookie) : {};
    if (cookies.wagmart_admin_session) {
      authManager.revokeSession(cookies.wagmart_admin_session);
    }
    res.setHeader('Set-Cookie', 'wagmart_admin_session=; Path=/; HttpOnly; Max-Age=0');
    res.redirect('/admin/login');
  });

  app.get('/admin/inquiries', requireAdminAuth, (req, res) => {
    const { search = '', status = 'All', topic = 'All', startDate = '', endDate = '', page = 1 } = req.query;
    const result = db.listInquiries({ search, status, topic, startDate, endDate, page, limit: 10 });
    const metrics = db.getMetrics();

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(
      renderDashboardPage({
        inquiries: result.inquiries,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        limit: result.limit,
        metrics,
        filters: { search, status, topic, startDate, endDate },
      })
    );
  });

  // Redirect root /admin to /admin/inquiries
  app.get('/admin', (req, res) => {
    res.redirect('/admin/inquiries');
  });

  return {
    app,
    db,
    mailer,
    rateLimiter,
    authManager,
    setSimulateDbFailure: (val) => { simulateDbFailure = val; },
    setSimulateEmailFailure: (val) => { simulateEmailFailure = val; },
  };
}

module.exports = {
  createApp,
};
