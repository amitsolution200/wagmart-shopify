const nodemailer = require('nodemailer');
const { safeLog } = require('./security');

class InquiryMailer {
  constructor() {
    this.mockSentEmails = [];
    this.transport = null;
    this.initTransport();
  }

  isMockMode() {
    // Default to mock mode unless explicitly disabled and SMTP host is provided
    if (process.env.MAIL_MOCK === 'false' && process.env.SMTP_HOST) {
      return false;
    }
    return true;
  }

  getNotificationRecipient() {
    return process.env.CONTACT_NOTIFICATION_EMAIL || 'support-inquiries@wagmart.com';
  }

  getFromAddress() {
    return process.env.MAIL_FROM || '"Wagmart Support Bot" <noreply@wagmart.com>';
  }

  initTransport() {
    if (!this.isMockMode()) {
      this.transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }
  }

  /**
   * Send email notification to store staff with customer's inquiry details.
   * Note: The customer's email is set as Reply-To so staff can directly reply.
   */
  async sendInquiryNotification(inquiry, { simulateFailure = false } = {}) {
    if (simulateFailure) {
      throw new Error('SIMULATED_EMAIL_FAILURE: Mail server connection timed out.');
    }

    const to = this.getNotificationRecipient();
    const from = this.getFromAddress();
    const replyTo = `"${inquiry.name}" <${inquiry.email}>`;
    const subject = `[Wagmart Inquiry ${inquiry.reference}] ${inquiry.topic} - ${inquiry.name}`;

    const textBody = `
========================================
NEW WAGMART INQUIRY: ${inquiry.reference}
========================================
Reference: ${inquiry.reference}
Submitted: ${inquiry.created_at}
Customer: ${inquiry.name} <${inquiry.email}>
Order Number: ${inquiry.order_number || 'N/A (General Inquiry)'}
Inquiry Topic: ${inquiry.topic}
Status: ${inquiry.status}

CUSTOMER MESSAGE:
----------------------------------------
${inquiry.message}
----------------------------------------

Manage this inquiry in Wagmart Dashboard:
http://localhost:3001/admin/inquiries?search=${encodeURIComponent(inquiry.reference)}
`;

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Inquiry: ${inquiry.reference}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAF8F5; margin: 0; padding: 24px; color: #1F2421; }
    .wm-card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #E5E7EB; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.04); }
    .wm-header { background-color: #7A46E5; color: #ffffff; padding: 20px 24px; }
    .wm-badge { display: inline-block; background-color: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; }
    .wm-title { margin: 8px 0 0 0; font-size: 20px; font-weight: 800; }
    .wm-body { padding: 24px; }
    .wm-row { margin-bottom: 12px; font-size: 14px; }
    .wm-label { font-weight: 700; color: #6B7280; width: 130px; display: inline-block; }
    .wm-val { color: #111827; }
    .wm-msg-box { background-color: #F9FAFB; border-left: 4px solid #7A46E5; padding: 16px; border-radius: 4px; margin-top: 16px; font-size: 14px; line-height: 1.6; white-space: pre-wrap; }
    .wm-btn { display: inline-block; background-color: #7A46E5; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 700; margin-top: 20px; }
    .wm-footer { background-color: #F9FAFB; padding: 16px 24px; font-size: 12px; color: #9CA3AF; text-align: center; border-top: 1px solid #E5E7EB; }
  </style>
</head>
<body>
  <div class="wm-card">
    <div class="wm-header">
      <span class="wm-badge">Wagmart Customer Support</span>
      <h1 class="wm-title">New Inquiry #${inquiry.reference}</h1>
    </div>
    <div class="wm-body">
      <div class="wm-row"><span class="wm-label">Reference:</span> <span class="wm-val"><strong>${inquiry.reference}</strong></span></div>
      <div class="wm-row"><span class="wm-label">Customer Name:</span> <span class="wm-val">${escapeHtml(inquiry.name)}</span></div>
      <div class="wm-row"><span class="wm-label">Customer Email:</span> <span class="wm-val"><a href="mailto:${escapeHtml(inquiry.email)}">${escapeHtml(inquiry.email)}</a></span></div>
      <div class="wm-row"><span class="wm-label">Order Number:</span> <span class="wm-val">${escapeHtml(inquiry.order_number || 'None (General Inquiry)')}</span></div>
      <div class="wm-row"><span class="wm-label">Inquiry Topic:</span> <span class="wm-val"><strong>${escapeHtml(inquiry.topic)}</strong></span></div>
      <div class="wm-row"><span class="wm-label">Submitted At:</span> <span class="wm-val">${inquiry.created_at}</span></div>
      
      <div style="margin-top: 20px; font-weight: 700; font-size: 14px; color: #374151;">Customer Message:</div>
      <div class="wm-msg-box">${escapeHtml(inquiry.message)}</div>

      <a href="http://localhost:3001/admin/inquiries?search=${encodeURIComponent(inquiry.reference)}" class="wm-btn">Open in Wagmart Dashboard →</a>
    </div>
    <div class="wm-footer">
      This is an automated notification from the Wagmart Storefront Service. Customer replies will be routed to ${escapeHtml(inquiry.email)}.
    </div>
  </div>
</body>
</html>
`;

    if (this.isMockMode()) {
      const emailRecord = {
        messageId: `mock-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        to,
        from,
        replyTo,
        subject,
        text: textBody,
        html: htmlBody,
        inquiryReference: inquiry.reference,
        sentAt: new Date().toISOString(),
      };
      this.mockSentEmails.push(emailRecord);
      safeLog('info', 'Email Mock Sent', {
        reference: inquiry.reference,
        to,
        topic: inquiry.topic,
        mode: 'mock',
      });
      return { success: true, messageId: emailRecord.messageId, mode: 'mock' };
    }

    // Real SMTP mode
    const info = await this.transport.sendMail({
      from,
      to,
      replyTo,
      subject,
      text: textBody,
      html: htmlBody,
    });

    safeLog('info', 'Email SMTP Sent', {
      reference: inquiry.reference,
      to,
      messageId: info.messageId,
      mode: 'smtp',
    });

    return { success: true, messageId: info.messageId, mode: 'smtp' };
  }

  /**
   * Retry email notification for an inquiry whose initial send failed.
   */
  async retryInquiryNotification(db, inquiryId) {
    const inquiry = db.getInquiryById(inquiryId);
    if (!inquiry) {
      throw new Error(`Inquiry with ID ${inquiryId} not found.`);
    }

    const previousRetries = db.getRetryLogs(inquiryId);
    const attemptNumber = previousRetries.length + 1;

    try {
      const sendResult = await this.sendInquiryNotification(inquiry);
      const deliveryStatus = this.isMockMode() ? 'mock_delivered' : 'sent';
      db.updateEmailDelivery(inquiry.id, deliveryStatus, null);
      db.logRetryAttempt(inquiry.id, attemptNumber, 'success', null);
      return {
        success: true,
        deliveryStatus,
        attemptNumber,
        message: 'Email notification resent successfully.',
      };
    } catch (err) {
      db.updateEmailDelivery(inquiry.id, 'failed', err.message);
      db.logRetryAttempt(inquiry.id, attemptNumber, 'failed', err.message);
      return {
        success: false,
        deliveryStatus: 'failed',
        attemptNumber,
        error: err.message,
      };
    }
  }

  getMockSentEmails() {
    return [...this.mockSentEmails];
  }

  clearMockSentEmails() {
    this.mockSentEmails = [];
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = {
  InquiryMailer,
};
