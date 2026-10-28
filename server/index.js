const fs = require('node:fs');
const path = require('node:path');
const { createApp } = require('./app');

// Load environment variables from .env if present
const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  try {
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eqIdx = line.indexOf('=');
      if (eqIdx === -1) continue;
      const key = line.slice(0, eqIdx).trim();
      let val = line.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (key && !(key in process.env)) {
        process.env[key] = val;
      }
    }
  } catch (err) {
    // Ignore .env read errors
  }
}

const PORT = parseInt(process.env.PORT || '3001', 10);
const { app, db, mailer } = createApp();

const server = app.listen(PORT, () => {
  console.log(`================================================================`);
  console.log(`🚀 Wagmart Support & Inquiries Service Started`);
  console.log(`📡 Local Server URL: http://localhost:${PORT}`);
  console.log(`📩 Public Form Endpoint: POST http://localhost:${PORT}/api/contact`);
  console.log(`🛡️ Admin Dashboard URL: http://localhost:${PORT}/admin/inquiries`);
  console.log(`📧 Mailer Mode: ${mailer.isMockMode() ? 'MOCK TRANSPORT (no external emails sent)' : 'SMTP LIVE TRANSPORT'}`);
  console.log(`📁 Database: ${db.dbPath}`);
  console.log(`================================================================`);
});

function gracefulShutdown(signal) {
  console.log(`\nReceived ${signal}. Shutting down Wagmart service gracefully...`);
  server.close(() => {
    db.close();
    console.log('Database connection closed. Process terminated.');
    process.exit(0);
  });
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

module.exports = { server, app };
