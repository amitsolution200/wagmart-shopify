function renderLoginPage(errorMessage = '') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Wagmart Admin Login | Storefront Inquiries</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #7A46E5;
      --primary-hover: #6332c9;
      --bg: #FAF8F5;
      --card-bg: #FFFFFF;
      --text: #1F2421;
      --text-muted: #6B7280;
      --border: #E5E7EB;
      --error: #DC2626;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    .wm-login-card {
      background: var(--card-bg);
      width: 100%;
      max-width: 420px;
      border-radius: 16px;
      border: 1px solid var(--border);
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
      padding: 36px 32px;
    }
    .wm-logo {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 24px;
    }
    .wm-logo-icon {
      width: 40px;
      height: 40px;
      background: var(--primary);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-weight: 800;
      font-size: 20px;
    }
    .wm-logo-text {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: #111827;
    }
    .wm-tag {
      display: inline-block;
      background: #EDE9FE;
      color: var(--primary);
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
    }
    h1 { font-size: 24px; font-weight: 800; margin-bottom: 8px; color: #111827; }
    p.desc { font-size: 13.5px; color: var(--text-muted); margin-bottom: 24px; line-height: 1.5; }
    .wm-form-group { margin-bottom: 20px; }
    label { display: block; font-size: 13px; font-weight: 700; color: #374151; margin-bottom: 6px; }
    input[type="password"], input[type="text"] {
      width: 100%;
      height: 46px;
      border: 1.5px solid var(--border);
      border-radius: 8px;
      padding: 0 14px;
      font-size: 14px;
      font-family: inherit;
      outline: none;
      transition: border-color 0.2s;
    }
    input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(122, 70, 229, 0.15); }
    .wm-btn-submit {
      width: 100%;
      height: 46px;
      background: var(--primary);
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.2s, transform 0.1s;
    }
    .wm-btn-submit:hover { background: var(--primary-hover); }
    .wm-btn-submit:active { transform: scale(0.99); }
    .wm-error {
      background: #FEF2F2;
      border: 1px solid #FECACA;
      color: var(--error);
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 13px;
      margin-bottom: 18px;
    }
    .wm-footnote {
      margin-top: 24px;
      padding-top: 18px;
      border-top: 1px solid #F3F4F6;
      font-size: 11.5px;
      color: #9CA3AF;
      text-align: center;
      line-height: 1.4;
    }
  </style>
</head>
<body>
  <div class="wm-login-card">
    <div class="wm-logo">
      <div class="wm-logo-icon">W</div>
      <div class="wm-logo-text">Wagmart</div>
    </div>
    <span class="wm-tag">Protected Admin Area</span>
    <h1>Inquiry Management</h1>
    <p class="desc">Sign in to view, search, filter, and manage customer inquiries.</p>

    ${errorMessage ? `<div class="wm-error" role="alert">${escapeHtml(errorMessage)}</div>` : ''}

    <form method="POST" action="/admin/login">
      <div class="wm-form-group">
        <label for="adminPassword">Admin Password / Secret Key</label>
        <input type="password" id="adminPassword" name="password" required autocomplete="current-password" placeholder="Enter admin password">
      </div>
      <button type="submit" class="wm-btn-submit">Sign In to Dashboard</button>
    </form>

    <div class="wm-footnote">
      Independent Storefront Backend Dashboard.<br>Does not replace or alter Shopify Admin login.
    </div>
  </div>
</body>
</html>`;
}

function renderDashboardPage({ inquiries, total, page, totalPages, limit, metrics, filters, userApiKey }) {
  const { search = '', status = 'All', topic = 'All', startDate = '', endDate = '' } = filters;

  const statusBadge = (s) => {
    switch (s) {
      case 'New':
        return '<span class="wm-badge wm-badge-new">New</span>';
      case 'In progress':
        return '<span class="wm-badge wm-badge-progress">In progress</span>';
      case 'Resolved':
        return '<span class="wm-badge wm-badge-resolved">Resolved</span>';
      default:
        return `<span class="wm-badge">${escapeHtml(s)}</span>`;
    }
  };

  const emailBadge = (e) => {
    switch (e) {
      case 'sent':
      case 'mock_delivered':
        return '<span class="wm-badge wm-badge-email-ok" title="Notification delivered">Delivered</span>';
      case 'failed':
        return '<span class="wm-badge wm-badge-email-fail" title="Delivery failed - retry available">Failed</span>';
      default:
        return '<span class="wm-badge wm-badge-email-pending">Pending</span>';
    }
  };

  const rows = inquiries.map((inq) => {
    const formattedDate = new Date(inq.created_at).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return `
      <tr data-inquiry-id="${inq.id}">
        <td class="wm-td-ref">
          <strong class="wm-ref-code">${escapeHtml(inq.reference)}</strong>
          <span class="wm-subdate">${formattedDate}</span>
        </td>
        <td class="wm-td-customer">
          <div class="wm-customer-name">${escapeHtml(inq.name)}</div>
          <a href="mailto:${escapeHtml(inq.email)}" class="wm-customer-email">${escapeHtml(inq.email)}</a>
        </td>
        <td class="wm-td-order">
          ${inq.order_number ? `<span class="wm-order-tag">${escapeHtml(inq.order_number)}</span>` : '<span class="wm-muted">—</span>'}
        </td>
        <td class="wm-td-topic">
          <span class="wm-topic-chip">${escapeHtml(inq.topic)}</span>
        </td>
        <td class="wm-td-status" id="status-cell-${inq.id}">
          ${statusBadge(inq.status)}
        </td>
        <td class="wm-td-email" id="email-cell-${inq.id}">
          ${emailBadge(inq.email_delivery_status)}
        </td>
        <td class="wm-td-actions">
          <button type="button" class="wm-action-btn" onclick="openDetailsModal(${inq.id})">
            Manage
          </button>
        </td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Wagmart Inquiries Dashboard | Pet Store Support</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Bebas+Neue&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #7A46E5;
      --primary-dark: #6332c9;
      --primary-light: #EDE9FE;
      --bg: #F5F2EF;
      --surface: #FFFFFF;
      --text: #1F2421;
      --text-muted: #6B7280;
      --border: #E5E7EB;
      --border-dark: #D1D5DB;
      --success: #059669;
      --warning: #D97706;
      --danger: #DC2626;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.5;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    /* Top Banner / Shopify Distinction */
    .wm-distinction-banner {
      background: #1F2937;
      color: #E5E7EB;
      font-size: 12.5px;
      padding: 10px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    .wm-distinction-banner strong { color: #FCD34D; }

    /* Header */
    header.wm-header {
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      padding: 16px 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 40;
    }
    .wm-brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .wm-brand-icon {
      width: 38px;
      height: 38px;
      background: var(--primary);
      border-radius: 9px;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 19px;
    }
    .wm-brand-title {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .wm-store-pill {
      font-size: 12px;
      background: #F3F4F6;
      color: #4B5563;
      padding: 4px 10px;
      border-radius: 999px;
      font-weight: 600;
    }
    .wm-header-actions {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .wm-logout-btn {
      background: transparent;
      border: 1px solid var(--border);
      color: #4B5563;
      padding: 7px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
    }
    .wm-logout-btn:hover { background: #F9FAFB; color: var(--danger); border-color: #FCA5A5; }

    /* Main Container */
    main.wm-main {
      max-width: 1440px;
      width: 100%;
      margin: 0 auto;
      padding: 28px clamp(16px, 2.5vw, 36px);
      flex: 1;
    }

    /* Metrics Grid */
    .wm-metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .wm-metric-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px 22px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.02);
    }
    .wm-metric-label {
      font-size: 12.5px;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 6px;
    }
    .wm-metric-val {
      font-size: 32px;
      font-weight: 800;
      line-height: 1;
      color: #111827;
    }
    .wm-metric-val.new { color: var(--warning); }
    .wm-metric-val.progress { color: var(--primary); }
    .wm-metric-val.resolved { color: var(--success); }

    /* Filters Bar */
    .wm-filter-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 20px 22px;
      margin-bottom: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.02);
    }
    .wm-filter-form {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 14px;
      align-items: end;
    }
    .wm-filter-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .wm-filter-field label {
      font-size: 12px;
      font-weight: 700;
      color: #4B5563;
    }
    .wm-input, .wm-select {
      height: 42px;
      border: 1.5px solid var(--border);
      border-radius: 8px;
      padding: 0 12px;
      font-size: 13.5px;
      font-family: inherit;
      background: #fff;
      outline: none;
      transition: border-color 0.2s;
    }
    .wm-input:focus, .wm-select:focus {
      border-color: var(--primary);
    }
    .wm-btn-filter {
      height: 42px;
      background: var(--primary);
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 13.5px;
      font-weight: 700;
      cursor: pointer;
      padding: 0 18px;
      transition: background 0.2s;
    }
    .wm-btn-filter:hover { background: var(--primary-dark); }
    .wm-btn-reset {
      height: 42px;
      background: #F3F4F6;
      color: #4B5563;
      border: 1px solid var(--border);
      border-radius: 8px;
      font-size: 13.5px;
      font-weight: 600;
      cursor: pointer;
      padding: 0 16px;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .wm-btn-reset:hover { background: #E5E7EB; }

    /* Table Container */
    .wm-table-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.02);
    }
    .wm-table-header-row {
      padding: 16px 22px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border);
    }
    .wm-table-title {
      font-size: 16px;
      font-weight: 800;
      color: #111827;
    }
    .wm-count-indicator {
      font-size: 13px;
      color: var(--text-muted);
    }
    .wm-table-wrapper {
      width: 100%;
      overflow-x: auto;
    }
    table.wm-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 13.5px;
    }
    table.wm-table th {
      background: #F9FAFB;
      color: #4B5563;
      font-weight: 700;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 12px 18px;
      border-bottom: 1px solid var(--border);
      white-space: nowrap;
    }
    table.wm-table td {
      padding: 14px 18px;
      border-bottom: 1px solid #F3F4F6;
      vertical-align: middle;
    }
    table.wm-table tr:hover { background: #FAF9F8; }

    .wm-ref-code {
      display: block;
      color: var(--primary);
      font-family: monospace;
      font-size: 13.5px;
      font-weight: 700;
    }
    .wm-subdate {
      display: block;
      font-size: 11.5px;
      color: var(--text-muted);
      margin-top: 2px;
    }
    .wm-customer-name { font-weight: 700; color: #111827; }
    .wm-customer-email { color: var(--text-muted); font-size: 12.5px; text-decoration: none; }
    .wm-customer-email:hover { text-decoration: underline; color: var(--primary); }
    .wm-order-tag {
      background: #EFF6FF;
      color: #2563EB;
      font-size: 12px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      font-family: monospace;
    }
    .wm-topic-chip {
      background: #F3F4F6;
      color: #374151;
      font-size: 12px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 999px;
      display: inline-block;
      white-space: nowrap;
    }

    /* Badges */
    .wm-badge {
      display: inline-block;
      font-size: 11.5px;
      font-weight: 700;
      padding: 3px 9px;
      border-radius: 999px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .wm-badge-new { background: #FEF3C7; color: #B45309; }
    .wm-badge-progress { background: #EDE9FE; color: #6D28D9; }
    .wm-badge-resolved { background: #D1FAE5; color: #047857; }
    .wm-badge-email-ok { background: #DCFCE7; color: #15803D; font-size: 11px; }
    .wm-badge-email-fail { background: #FEE2E2; color: #B91C1C; font-size: 11px; }
    .wm-badge-email-pending { background: #F3F4F6; color: #6B7280; font-size: 11px; }

    .wm-action-btn {
      background: #fff;
      border: 1.5px solid var(--border);
      color: var(--primary);
      padding: 6px 14px;
      border-radius: 7px;
      font-size: 12.5px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
    }
    .wm-action-btn:hover {
      background: var(--primary-light);
      border-color: var(--primary);
    }

    /* Pagination */
    .wm-pagination {
      padding: 16px 22px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid var(--border);
      font-size: 13px;
    }
    .wm-page-controls {
      display: flex;
      gap: 8px;
    }
    .wm-page-btn {
      padding: 6px 12px;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: #fff;
      font-size: 13px;
      font-weight: 600;
      color: #374151;
      text-decoration: none;
      cursor: pointer;
    }
    .wm-page-btn:hover:not(:disabled) { background: #F9FAFB; }
    .wm-page-btn:disabled, .wm-page-btn.disabled { opacity: 0.5; cursor: not-allowed; pointer-events: none; }

    /* Empty state */
    .wm-empty-state {
      padding: 60px 20px;
      text-align: center;
      color: var(--text-muted);
    }
    .wm-empty-state h3 { font-size: 18px; color: #111827; margin-bottom: 6px; }

    /* Modal Backdrop */
    .wm-modal-backdrop {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(2px);
      z-index: 99;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .wm-modal-backdrop.is-open { display: flex; }
    .wm-modal-card {
      background: #FFFFFF;
      width: 100%;
      max-width: 620px;
      border-radius: 16px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
      overflow: hidden;
      animation: wmFadeIn 0.15s ease-out;
      display: flex;
      flex-direction: column;
      max-height: 90vh;
    }
    @keyframes wmFadeIn {
      from { opacity: 0; transform: scale(0.97); }
      to { opacity: 1; transform: scale(1); }
    }
    .wm-modal-header {
      background: #F9FAFB;
      padding: 18px 24px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .wm-modal-title { font-size: 17px; font-weight: 800; color: #111827; }
    .wm-modal-close {
      background: none;
      border: none;
      font-size: 22px;
      line-height: 1;
      color: var(--text-muted);
      cursor: pointer;
    }
    .wm-modal-body {
      padding: 24px;
      overflow-y: auto;
      font-size: 14px;
    }
    .wm-modal-field {
      margin-bottom: 16px;
    }
    .wm-modal-label {
      font-size: 12px;
      font-weight: 700;
      color: #6B7280;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .wm-modal-msg {
      background: #F9FAFB;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 14px;
      line-height: 1.6;
      white-space: pre-wrap;
      font-size: 13.5px;
      color: #111827;
      margin-top: 6px;
    }
    .wm-modal-footer {
      background: #F9FAFB;
      padding: 16px 24px;
      border-top: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }

    @media (max-width: 768px) {
      .wm-distinction-banner { flex-direction: column; align-items: flex-start; gap: 6px; }
      header.wm-header { padding: 14px 18px; }
      .wm-filter-form { grid-template-columns: 1fr; }
      .wm-pagination { flex-direction: column; gap: 12px; }
    }
  </style>
</head>
<body>

  <!-- Top Disclaimer Notice -->
  <aside class="wm-distinction-banner" role="complementary">
    <div>
      <strong>Independent Inquiry System:</strong> Inquiries are safely persisted in Wagmart's application SQLite database, decoupled from Shopify Admin.
    </div>
    <div style="font-size: 11.5px; opacity: 0.9;">
      Storefront: gk2scz-zu.myshopify.com
    </div>
  </aside>

  <!-- Navigation Header -->
  <header class="wm-header">
    <div class="wm-brand">
      <div class="wm-brand-icon">W</div>
      <div>
        <h1 class="wm-brand-title">Wagmart Support Admin</h1>
      </div>
      <span class="wm-store-pill">Live Inquiry Stream</span>
    </div>
    <div class="wm-header-actions">
      <form method="POST" action="/admin/logout" style="display:inline;">
        <button type="submit" class="wm-logout-btn">Log Out</button>
      </form>
    </div>
  </header>

  <main class="wm-main">

    <!-- Metrics Bar -->
    <section class="wm-metrics-grid" aria-label="Support Metrics">
      <div class="wm-metric-card">
        <div class="wm-metric-label">Total Inquiries</div>
        <div class="wm-metric-val">${metrics.total}</div>
      </div>
      <div class="wm-metric-card">
        <div class="wm-metric-label">New / Pending</div>
        <div class="wm-metric-val new">${metrics.new}</div>
      </div>
      <div class="wm-metric-card">
        <div class="wm-metric-label">In Progress</div>
        <div class="wm-metric-val progress">${metrics.inProgress}</div>
      </div>
      <div class="wm-metric-card">
        <div class="wm-metric-label">Resolved</div>
        <div class="wm-metric-val resolved">${metrics.resolved}</div>
      </div>
    </section>

    <!-- Search & Filters -->
    <section class="wm-filter-card" aria-label="Filters">
      <form method="GET" action="/admin/inquiries" class="wm-filter-form">
        <div class="wm-filter-field">
          <label for="filterSearch">Search Inquiries</label>
          <input type="text" id="filterSearch" name="search" value="${escapeHtml(search)}" placeholder="Ref, name, email, order #" class="wm-input">
        </div>

        <div class="wm-filter-field">
          <label for="filterStatus">Status</label>
          <select id="filterStatus" name="status" class="wm-select">
            <option value="All" ${status === 'All' ? 'selected' : ''}>All Statuses</option>
            <option value="New" ${status === 'New' ? 'selected' : ''}>New</option>
            <option value="In progress" ${status === 'In progress' ? 'selected' : ''}>In progress</option>
            <option value="Resolved" ${status === 'Resolved' ? 'selected' : ''}>Resolved</option>
          </select>
        </div>

        <div class="wm-filter-field">
          <label for="filterTopic">Topic</label>
          <select id="filterTopic" name="topic" class="wm-select">
            <option value="All" ${topic === 'All' ? 'selected' : ''}>All Topics</option>
            <option value="Product Advice & Sizing" ${topic === 'Product Advice & Sizing' ? 'selected' : ''}>Product Advice & Sizing</option>
            <option value="Order Tracking & Shipping" ${topic === 'Order Tracking & Shipping' ? 'selected' : ''}>Order Tracking & Shipping</option>
            <option value="Returns & Exchanges" ${topic === 'Returns & Exchanges' ? 'selected' : ''}>Returns & Exchanges</option>
            <option value="Grooming & Hygiene Care" ${topic === 'Grooming & Hygiene Care' ? 'selected' : ''}>Grooming & Hygiene Care</option>
            <option value="Other Inquiries" ${topic === 'Other Inquiries' ? 'selected' : ''}>Other Inquiries</option>
          </select>
        </div>

        <div class="wm-filter-field">
          <label for="filterStart">From Date</label>
          <input type="date" id="filterStart" name="startDate" value="${escapeHtml(startDate)}" class="wm-input">
        </div>

        <div class="wm-filter-field">
          <label for="filterEnd">To Date</label>
          <input type="date" id="filterEnd" name="endDate" value="${escapeHtml(endDate)}" class="wm-input">
        </div>

        <div style="display:flex; gap:8px;">
          <button type="submit" class="wm-btn-filter">Filter</button>
          <a href="/admin/inquiries" class="wm-btn-reset">Reset</a>
        </div>
      </form>
    </section>

    <!-- Inquiries Table -->
    <section class="wm-table-card" aria-label="Inquiry Records">
      <div class="wm-table-header-row">
        <h2 class="wm-table-title">Customer Inquiries</h2>
        <span class="wm-count-indicator">Showing ${inquiries.length} of ${total} total inquiries</span>
      </div>

      <div class="wm-table-wrapper">
        ${
          inquiries.length === 0
            ? `
          <div class="wm-empty-state">
            <h3>No inquiries found</h3>
            <p>Try clearing filters or check back when new inquiries are submitted.</p>
          </div>
        `
            : `
          <table class="wm-table">
            <thead>
              <tr>
                <th>Reference & Date</th>
                <th>Customer</th>
                <th>Order #</th>
                <th>Topic</th>
                <th>Status</th>
                <th>Email Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        `
        }
      </div>

      <!-- Pagination -->
      <footer class="wm-pagination">
        <div>
          Page <strong>${page}</strong> of <strong>${totalPages}</strong>
        </div>
        <div class="wm-page-controls">
          ${
            page > 1
              ? `<a href="/admin/inquiries?page=${page - 1}&search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}&topic=${encodeURIComponent(topic)}&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}" class="wm-page-btn">← Previous</a>`
              : `<button disabled class="wm-page-btn disabled">← Previous</button>`
          }
          ${
            page < totalPages
              ? `<a href="/admin/inquiries?page=${page + 1}&search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}&topic=${encodeURIComponent(topic)}&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}" class="wm-page-btn">Next →</a>`
              : `<button disabled class="wm-page-btn disabled">Next →</button>`
          }
        </div>
      </footer>
    </section>

  </main>

  <!-- Modal for Inquiry Details & Management -->
  <div class="wm-modal-backdrop" id="inquiryModal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
    <div class="wm-modal-card">
      <div class="wm-modal-header">
        <h3 class="wm-modal-title" id="modalTitle">Inquiry Details</h3>
        <button type="button" class="wm-modal-close" onclick="closeDetailsModal()" aria-label="Close modal">&times;</button>
      </div>
      <div class="wm-modal-body" id="modalContent">
        <!-- Injected via JavaScript -->
      </div>
      <div class="wm-modal-footer" id="modalFooter">
        <!-- Injected via JavaScript -->
      </div>
    </div>
  </div>

  <script>
    var currentInquiry = null;

    function openDetailsModal(id) {
      var modal = document.getElementById('inquiryModal');
      var content = document.getElementById('modalContent');
      var footer = document.getElementById('modalFooter');

      content.innerHTML = '<div style="padding: 20px; text-align: center;">Loading details...</div>';
      modal.classList.add('is-open');

      fetch('/api/admin/inquiries/' + id)
        .then(function(res) {
          if (!res.ok) throw new Error('Failed to load inquiry');
          return res.json();
        })
        .then(function(data) {
          currentInquiry = data.inquiry;
          renderModalContent(data.inquiry, data.retries);
        })
        .catch(function(err) {
          content.innerHTML = '<div style="color: #DC2626; padding: 20px;">Error: ' + err.message + '</div>';
        });
    }

    function renderModalContent(inq, retries) {
      var content = document.getElementById('modalContent');
      var footer = document.getElementById('modalFooter');

      var retryHtml = '';
      if (inq.email_delivery_status === 'failed') {
        retryHtml = '<div style="background: #FEF2F2; border: 1px solid #FECACA; color: #991B1B; padding: 12px; border-radius: 8px; margin-top: 14px; font-size: 13px;">' +
          '<strong>Email Delivery Failed:</strong> ' + (inq.email_error || 'Network error') +
          '<div style="margin-top: 8px;"><button type="button" class="wm-btn-filter" style="height: 32px; padding: 0 12px; font-size: 12px;" onclick="retryEmail(' + inq.id + ')">↻ Retry Email Delivery</button></div>' +
          '</div>';
      }

      content.innerHTML =
        '<div class="wm-modal-field">' +
          '<div class="wm-modal-label">Inquiry Reference</div>' +
          '<div style="font-family: monospace; font-size: 16px; font-weight: 700; color: #7A46E5;">' + inq.reference + '</div>' +
        '</div>' +
        '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">' +
          '<div class="wm-modal-field">' +
            '<div class="wm-modal-label">Customer Name</div>' +
            '<div style="font-weight: 600;">' + escapeHtml(inq.name) + '</div>' +
          '</div>' +
          '<div class="wm-modal-field">' +
            '<div class="wm-modal-label">Email Address</div>' +
            '<div><a href="mailto:' + escapeHtml(inq.email) + '" style="color: #7A46E5;">' + escapeHtml(inq.email) + '</a></div>' +
          '</div>' +
          '<div class="wm-modal-field">' +
            '<div class="wm-modal-label">Order Number</div>' +
            '<div>' + (inq.order_number ? escapeHtml(inq.order_number) : '<span style="color:#9CA3AF;">None</span>') + '</div>' +
          '</div>' +
          '<div class="wm-modal-field">' +
            '<div class="wm-modal-label">Inquiry Topic</div>' +
            '<div style="font-weight: 600;">' + escapeHtml(inq.topic) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="wm-modal-field">' +
          '<div class="wm-modal-label">Customer Message</div>' +
          '<div class="wm-modal-msg">' + escapeHtml(inq.message) + '</div>' +
        '</div>' +
        '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; font-size: 12px; color: #6B7280; margin-top: 14px;">' +
          '<div>Submitted: ' + new Date(inq.created_at).toLocaleString() + '</div>' +
          '<div>Email Status: <strong>' + inq.email_delivery_status + '</strong></div>' +
        '</div>' +
        retryHtml;

      footer.innerHTML =
        '<div style="display: flex; align-items: center; gap: 10px;">' +
          '<label for="changeStatusSelect" style="font-size: 13px; font-weight: 700;">Update Status:</label>' +
          '<select id="changeStatusSelect" class="wm-select" style="height: 36px; font-size: 13px;">' +
            '<option value="New"' + (inq.status === 'New' ? ' selected' : '') + '>New</option>' +
            '<option value="In progress"' + (inq.status === 'In progress' ? ' selected' : '') + '>In progress</option>' +
            '<option value="Resolved"' + (inq.status === 'Resolved' ? ' selected' : '') + '>Resolved</option>' +
          '</select>' +
          '<button type="button" class="wm-btn-filter" style="height: 36px; padding: 0 14px; font-size: 13px;" onclick="saveStatus(' + inq.id + ')">Save Status</button>' +
        '</div>' +
        '<button type="button" class="wm-btn-reset" style="height: 36px;" onclick="closeDetailsModal()">Close</button>';
    }

    function saveStatus(id) {
      var select = document.getElementById('changeStatusSelect');
      var newStatus = select.value;

      fetch('/api/admin/inquiries/' + id + '/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.success) {
          // Update status cell in table
          var cell = document.getElementById('status-cell-' + id);
          if (cell) {
            cell.innerHTML = getStatusBadgeHtml(newStatus);
          }
          closeDetailsModal();
        } else {
          alert('Failed to update status: ' + data.error);
        }
      })
      .catch(function(err) {
        alert('Network error: ' + err.message);
      });
    }

    function retryEmail(id) {
      fetch('/api/admin/inquiries/' + id + '/retry-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.success) {
          alert('Email notification sent successfully!');
          openDetailsModal(id);
          var cell = document.getElementById('email-cell-' + id);
          if (cell) cell.innerHTML = '<span class="wm-badge wm-badge-email-ok">Delivered</span>';
        } else {
          alert('Retry failed: ' + data.error);
        }
      })
      .catch(function(err) {
        alert('Retry network error: ' + err.message);
      });
    }

    function getStatusBadgeHtml(status) {
      if (status === 'New') return '<span class="wm-badge wm-badge-new">New</span>';
      if (status === 'In progress') return '<span class="wm-badge wm-badge-progress">In progress</span>';
      if (status === 'Resolved') return '<span class="wm-badge wm-badge-resolved">Resolved</span>';
      return '<span class="wm-badge">' + escapeHtml(status) + '</span>';
    }

    function closeDetailsModal() {
      document.getElementById('inquiryModal').classList.remove('is-open');
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
  </script>
</body>
</html>`;
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
  renderLoginPage,
  renderDashboardPage,
};
