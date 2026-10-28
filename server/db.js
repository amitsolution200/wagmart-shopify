const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const crypto = require('node:crypto');

const DEFAULT_DB_PATH = path.resolve(__dirname, '..', 'data', 'inquiries.db');

class InquiryDatabase {
  constructor(dbPath = DEFAULT_DB_PATH) {
    this.dbPath = dbPath;
    this.init();
  }

  init() {
    if (this.dbPath !== ':memory:') {
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    this.db = new DatabaseSync(this.dbPath);

    // Pragmas for reliability and performance
    this.db.exec('PRAGMA foreign_keys = ON;');
    this.db.exec('PRAGMA journal_mode = WAL;');

    // Migrations
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS inquiries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reference TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        order_number TEXT,
        topic TEXT NOT NULL,
        message TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'New' CHECK (status IN ('New', 'In progress', 'Resolved')),
        email_delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (email_delivery_status IN ('pending', 'sent', 'failed', 'mock_delivered')),
        email_error TEXT,
        ip_address TEXT,
        user_agent TEXT,
        payload_hash TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_inquiries_ref ON inquiries(reference);
      CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);
      CREATE INDEX IF NOT EXISTS idx_inquiries_topic ON inquiries(topic);
      CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON inquiries(created_at);
      CREATE INDEX IF NOT EXISTS idx_inquiries_hash ON inquiries(payload_hash);
      CREATE INDEX IF NOT EXISTS idx_inquiries_email ON inquiries(email);

      CREATE TABLE IF NOT EXISTS email_retry_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        inquiry_id INTEGER NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
        attempt_number INTEGER NOT NULL,
        status TEXT NOT NULL,
        error_message TEXT,
        attempted_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_retry_inquiry_id ON email_retry_log(inquiry_id);
    `);
  }

  computeHash(email, topic, message) {
    return crypto
      .createHash('sha256')
      .update(`${email.trim().toLowerCase()}|${topic.trim()}|${message.trim()}`)
      .digest('hex');
  }

  generateReference() {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const randomHex = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `WAG-INQ-${dateStr}-${randomHex}`;
  }

  /**
   * Find recent duplicate submission within windowSeconds (prevents accidental double clicks).
   */
  findRecentDuplicate(email, topic, message, windowSeconds = 60) {
    const hash = this.computeHash(email, topic, message);
    const sql = `
      SELECT * FROM inquiries
      WHERE payload_hash = ?
        AND (strftime('%s', 'now') - strftime('%s', created_at)) <= ?
      ORDER BY id DESC
      LIMIT 1
    `;
    const stmt = this.db.prepare(sql);
    return stmt.get(hash, windowSeconds);
  }

  /**
   * Save a new inquiry with unique reference and New status.
   */
  createInquiry({ name, email, order_number = null, topic, message, ip_address = null, user_agent = null }) {
    let reference = this.generateReference();
    // Guard against collision (astronomically rare)
    let collisionCheck = this.getInquiryByReference(reference);
    let attempts = 0;
    while (collisionCheck && attempts < 5) {
      reference = this.generateReference();
      collisionCheck = this.getInquiryByReference(reference);
      attempts++;
    }

    const hash = this.computeHash(email, topic, message);
    const now = new Date().toISOString();

    const insertSql = `
      INSERT INTO inquiries (
        reference, name, email, order_number, topic, message,
        status, email_delivery_status, email_error, ip_address, user_agent,
        payload_hash, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'New', 'pending', NULL, ?, ?, ?, ?, ?)
    `;

    const stmt = this.db.prepare(insertSql);
    const result = stmt.run(
      reference,
      name.trim(),
      email.trim().toLowerCase(),
      order_number ? order_number.trim() : null,
      topic.trim(),
      message.trim(),
      ip_address,
      user_agent ? user_agent.slice(0, 255) : null,
      hash,
      now,
      now
    );

    return this.getInquiryById(Number(result.lastInsertRowid));
  }

  getInquiryById(id) {
    const stmt = this.db.prepare('SELECT * FROM inquiries WHERE id = ?');
    return stmt.get(Number(id));
  }

  getInquiryByReference(reference) {
    const stmt = this.db.prepare('SELECT * FROM inquiries WHERE reference = ?');
    return stmt.get(reference);
  }

  /**
   * List inquiries with search, status filter, topic filter, and pagination.
   */
  listInquiries({ search = '', status = '', topic = '', startDate = '', endDate = '', page = 1, limit = 10 } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * pageSize;

    const whereClauses = [];
    const params = [];

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      whereClauses.push('(reference LIKE ? OR name LIKE ? OR email LIKE ? OR order_number LIKE ?)');
      params.push(q, q, q, q);
    }

    if (status && status.trim() && status !== 'All') {
      whereClauses.push('status = ?');
      params.push(status.trim());
    }

    if (topic && topic.trim() && topic !== 'All') {
      whereClauses.push('topic = ?');
      params.push(topic.trim());
    }

    if (startDate && startDate.trim()) {
      whereClauses.push('created_at >= ?');
      params.push(`${startDate.trim()}T00:00:00.000Z`);
    }

    if (endDate && endDate.trim()) {
      whereClauses.push('created_at <= ?');
      params.push(`${endDate.trim()}T23:59:59.999Z`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Count total matching
    const countSql = `SELECT COUNT(*) AS total FROM inquiries ${whereSql}`;
    const countStmt = this.db.prepare(countSql);
    const countResult = countStmt.get(...params);
    const total = countResult ? countResult.total : 0;

    // Fetch paginated rows
    const dataSql = `
      SELECT id, reference, name, email, order_number, topic, message,
             status, email_delivery_status, email_error, created_at, updated_at
      FROM inquiries
      ${whereSql}
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `;
    const dataStmt = this.db.prepare(dataSql);
    const items = dataStmt.all(...params, pageSize, offset);

    return {
      inquiries: items,
      total,
      page: pageNum,
      limit: pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  /**
   * Update inquiry status ('New', 'In progress', 'Resolved')
   */
  updateInquiryStatus(id, newStatus) {
    const validStatuses = ['New', 'In progress', 'Resolved'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}. Must be one of: ${validStatuses.join(', ')}`);
    }

    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE inquiries
      SET status = ?, updated_at = ?
      WHERE id = ?
    `);
    const result = stmt.run(newStatus, now, Number(id));
    return result.changes > 0 ? this.getInquiryById(id) : null;
  }

  /**
   * Update email delivery status and error
   */
  updateEmailDelivery(id, deliveryStatus, errorMessage = null) {
    const valid = ['pending', 'sent', 'failed', 'mock_delivered'];
    if (!valid.includes(deliveryStatus)) {
      throw new Error(`Invalid email delivery status: ${deliveryStatus}`);
    }

    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE inquiries
      SET email_delivery_status = ?, email_error = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(deliveryStatus, errorMessage, now, Number(id));
    return this.getInquiryById(id);
  }

  /**
   * Record a retry attempt in the audit log
   */
  logRetryAttempt(inquiryId, attemptNumber, status, errorMessage = null) {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO email_retry_log (inquiry_id, attempt_number, status, error_message, attempted_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    return stmt.run(Number(inquiryId), attemptNumber, status, errorMessage, now);
  }

  getRetryLogs(inquiryId) {
    const stmt = this.db.prepare(`
      SELECT * FROM email_retry_log
      WHERE inquiry_id = ?
      ORDER BY id ASC
    `);
    return stmt.all(Number(inquiryId));
  }

  /**
   * Metrics summary for dashboard cards
   */
  getMetrics() {
    const totalStmt = this.db.prepare('SELECT COUNT(*) AS total FROM inquiries');
    const newStmt = this.db.prepare("SELECT COUNT(*) AS count FROM inquiries WHERE status = 'New'");
    const inProgressStmt = this.db.prepare("SELECT COUNT(*) AS count FROM inquiries WHERE status = 'In progress'");
    const resolvedStmt = this.db.prepare("SELECT COUNT(*) AS count FROM inquiries WHERE status = 'Resolved'");
    const emailFailedStmt = this.db.prepare("SELECT COUNT(*) AS count FROM inquiries WHERE email_delivery_status = 'failed'");

    return {
      total: totalStmt.get()?.total || 0,
      new: newStmt.get()?.count || 0,
      inProgress: inProgressStmt.get()?.count || 0,
      resolved: resolvedStmt.get()?.count || 0,
      emailFailed: emailFailedStmt.get()?.count || 0,
    };
  }

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

module.exports = {
  InquiryDatabase,
  DEFAULT_DB_PATH,
};
