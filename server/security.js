const crypto = require('node:crypto');

const VALID_TOPICS = [
  'Product Advice & Sizing',
  'Order Tracking & Shipping',
  'Returns & Exchanges',
  'Grooming & Hygiene Care',
  'Other Inquiries',
];

// RFC 5322 simplified email regex
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

// Safe alphanumeric pattern for optional order number
const ORDER_REGEX = /^[A-Za-z0-9#\-_ ]*$/;

/**
 * Server-side input validation and sanitization.
 */
function validateInquiryInput({ name, email, order_number, topic, message, hp_website }) {
  const errors = {};

  // 1. Honeypot check (spam protection)
  if (hp_website && typeof hp_website === 'string' && hp_website.trim().length > 0) {
    return {
      isValid: false,
      isSpam: true,
      errors: { honeypot: 'Automated submission rejected.' },
    };
  }

  // 2. Name validation (2 to 100 characters)
  if (!name || typeof name !== 'string') {
    errors.name = 'Full name is required.';
  } else {
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      errors.name = 'Name must be at least 2 characters.';
    } else if (trimmedName.length > 100) {
      errors.name = 'Name cannot exceed 100 characters.';
    }
  }

  // 3. Email validation
  if (!email || typeof email !== 'string') {
    errors.email = 'Email address is required.';
  } else {
    const trimmedEmail = email.trim();
    if (trimmedEmail.length > 254) {
      errors.email = 'Email address is too long.';
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      errors.email = 'Please provide a valid email address (e.g. name@domain.com).';
    }
  }

  // 4. Order number validation (optional, max 50 characters, safe characters)
  let cleanOrder = null;
  if (order_number !== undefined && order_number !== null && String(order_number).trim() !== '') {
    const orderStr = String(order_number).trim();
    if (orderStr.length > 50) {
      errors.order_number = 'Order number cannot exceed 50 characters.';
    } else if (!ORDER_REGEX.test(orderStr)) {
      errors.order_number = 'Order number can only contain letters, numbers, hyphens, and #.';
    } else {
      cleanOrder = orderStr;
    }
  }

  // 5. Topic validation
  if (!topic || typeof topic !== 'string' || !VALID_TOPICS.includes(topic.trim())) {
    errors.topic = `Please select a valid topic from: ${VALID_TOPICS.join(', ')}.`;
  }

  // 6. Message validation (10 to 5000 characters)
  if (!message || typeof message !== 'string') {
    errors.message = 'Inquiry message is required.';
  } else {
    const trimmedMessage = message.trim();
    if (trimmedMessage.length < 10) {
      errors.message = 'Message must be at least 10 characters so we can assist you.';
    } else if (trimmedMessage.length > 5000) {
      errors.message = 'Message cannot exceed 5000 characters.';
    }
  }

  const isValid = Object.keys(errors).length === 0;

  return {
    isValid,
    isSpam: false,
    errors,
    sanitized: isValid
      ? {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          order_number: cleanOrder,
          topic: topic.trim(),
          message: message.trim(),
        }
      : null,
  };
}

/**
 * Sliding Window In-Memory Rate Limiter.
 */
class RateLimiter {
  constructor(windowMs = 15 * 60 * 1000, maxRequests = 5) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.hits = new Map();
  }

  check(ip) {
    const now = Date.now();
    const cleanIp = ip || 'unknown-ip';
    const timestamps = this.hits.get(cleanIp) || [];
    const validTimestamps = timestamps.filter((t) => now - t < this.windowMs);

    if (validTimestamps.length >= this.maxRequests) {
      const oldest = validTimestamps[0];
      const resetInSeconds = Math.ceil((oldest + this.windowMs - now) / 1000);
      this.hits.set(cleanIp, validTimestamps);
      return {
        isAllowed: false,
        remaining: 0,
        resetInSeconds,
      };
    }

    validTimestamps.push(now);
    this.hits.set(cleanIp, validTimestamps);

    return {
      isAllowed: true,
      remaining: this.maxRequests - validTimestamps.length,
      resetInSeconds: Math.ceil(this.windowMs / 1000),
    };
  }

  reset() {
    this.hits.clear();
  }
}

/**
 * Admin Authentication and Session Management.
 */
class AuthManager {
  constructor() {
    this.activeSessions = new Map(); // token -> { createdAt, expiresAt }
  }

  getAdminPassword() {
    return process.env.ADMIN_PASSWORD || 'wagmart_admin_2026';
  }

  getAdminApiKey() {
    return process.env.ADMIN_API_KEY || 'wagmart_admin_api_key_2026';
  }

  createSession() {
    const token = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    const expiresAt = now + 24 * 60 * 60 * 1000; // 24 hours
    this.activeSessions.set(token, { createdAt: now, expiresAt });
    return token;
  }

  validateSession(token) {
    if (!token) return false;
    const session = this.activeSessions.get(token);
    if (!session) return false;
    if (Date.now() > session.expiresAt) {
      this.activeSessions.delete(token);
      return false;
    }
    return true;
  }

  revokeSession(token) {
    if (token) this.activeSessions.delete(token);
  }

  authenticateRequest(req) {
    // 1. Check Bearer Token or x-api-key header
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ')) {
      const bearerToken = authHeader.slice(7).trim();
      if (bearerToken === this.getAdminApiKey()) return true;
      if (this.validateSession(bearerToken)) return true;
    }

    const apiKeyHeader = req.headers['x-api-key'];
    if (apiKeyHeader && apiKeyHeader === this.getAdminApiKey()) {
      return true;
    }

    // 2. Check Cookie
    const cookies = req.headers.cookie ? parseCookies(req.headers.cookie) : {};
    if (cookies.wagmart_admin_session && this.validateSession(cookies.wagmart_admin_session)) {
      return true;
    }

    return false;
  }
}

function parseCookies(cookieHeader) {
  const list = {};
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach((cookie) => {
    let [name, ...rest] = cookie.split('=');
    name = name.trim();
    if (!name) return;
    const value = rest.join('=').trim();
    list[name] = decodeURIComponent(value);
  });
  return list;
}

/**
 * Safe logging helper that protects customer privacy and secrets.
 * Never logs full message bodies or auth tokens.
 */
function safeLog(level, eventName, metadata = {}) {
  const safeData = { ...metadata };
  if (safeData.email) {
    const parts = safeData.email.split('@');
    if (parts.length === 2) {
      const user = parts[0];
      const maskedUser = user.length > 2 ? `${user[0]}***${user.slice(-1)}` : '***';
      safeData.email = `${maskedUser}@${parts[1]}`;
    }
  }
  if (safeData.message) {
    safeData.message = `[Redacted, length: ${metadata.message.length} chars]`;
  }
  const timestamp = new Date().toISOString();
  console[level](`[Wagmart ${eventName}] [${timestamp}]`, JSON.stringify(safeData));
}

module.exports = {
  VALID_TOPICS,
  validateInquiryInput,
  RateLimiter,
  AuthManager,
  parseCookies,
  safeLog,
};
