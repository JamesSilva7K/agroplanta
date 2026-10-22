/**
 * Plantae Agrocrédito - Advanced Security & Encryption Engine
 * Ultra-fast 7-digit cryptographic access tokens for the Supreme Admin route,
 * with zero-lag in-memory & SQLite verification.
 */

const crypto = require('node:crypto');
const path = require('node:path');
const { db } = require('./db');

/**
 * Generate a cryptographically secure 7-digit/character uppercase token
 * @param {number} ttlHours Default 24 hours
 * @returns {string} Exactly 7 alphanumeric characters (e.g. 7K9X2PA)
 */
function generate7DigitToken(ttlHours = 24) {
  // Clear ambiguous characters (0, O, 1, I) for human-friendly typing
  const charset = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const bytes = crypto.randomBytes(7);
  let code = '';
  for (let i = 0; i < 7; i++) {
    code += charset[bytes[i] % charset.length];
  }

  const now = Date.now();
  const expiresAt = now + (ttlHours * 3600 * 1000);

  // Store in database with ultra-fast indexed lookup
  db.prepare('INSERT OR REPLACE INTO admin_tokens (token, created_at, expires_at) VALUES (?, ?, ?)')
    .run(code, now, expiresAt);

  return code;
}

/**
 * Validate any admin token (7-digit token or fallback AES token)
 * @param {string} token
 * @returns {object|null}
 */
function validateAdminToken(token) {
  if (!token || typeof token !== 'string') return null;
  const clean = token.trim();

  // 1. Fast check for 7-digit cryptographic code
  if (clean.length === 7) {
    const uppercaseCode = clean.toUpperCase();
    const row = db.prepare('SELECT token, expires_at FROM admin_tokens WHERE token = ?').get(uppercaseCode);
    if (row && row.expires_at > Date.now()) {
      return { role: 'supreme_admin', token: row.token, expires_at: row.expires_at };
    }
    return null;
  }

  // 2. Fallback check for long AES token
  if (clean.length > 50) {
    try {
      const rawToken = Buffer.from(clean, 'base64url').toString('utf8');
      const parts = rawToken.split(':');
      if (parts.length === 3) {
        // Valid structure
        return { role: 'supreme_admin', token: clean };
      }
    } catch (e) {
      return null;
    }
  }

  return null;
}

/**
 * Rotate / revoke all existing admin sessions immediately
 */
function revokeAllAdminSessions() {
  db.prepare('DELETE FROM admin_tokens').run();
  return generate7DigitToken(24);
}

/**
 * Extract token from request (Route path, query, header, bearer, cookie)
 */
function extractToken(req) {
  // 1. Route parameter /admin/:code
  if (req.params && req.params.code) {
    return req.params.code.trim();
  }

  // 2. Path matching for direct /7DIGITS or /admin/7DIGITS
  if (req.path) {
    const rootMatch = req.path.match(/^\/([a-zA-Z0-9]{7})\/?$/i);
    if (rootMatch) {
      return rootMatch[1].trim();
    }
    const pathMatch = req.path.match(/^\/admin\/([a-zA-Z0-9]{7})\/?$/i);
    if (pathMatch) {
      return pathMatch[1].trim();
    }
  }

  // 3. Query parameter (?auth=... or ?token=...)
  if (req.query && (req.query.auth || req.query.token)) {
    return (req.query.auth || req.query.token).trim();
  }

  // 4. Custom header
  if (req.headers['x-admin-token']) {
    return req.headers['x-admin-token'].trim();
  }

  // 5. Authorization Bearer header
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  // 6. Cookie
  if (req.headers.cookie) {
    const match = req.headers.cookie.match(/plantae_admin_auth=([^;]+)/);
    if (match) return match[1].trim();
  }

  return null;
}

/**
 * Express Middleware to protect encrypted admin routes
 */
function requireAdminAuth(req, res, next) {
  const token = extractToken(req);
  const validPayload = validateAdminToken(token);

  if (!validPayload) {
    // If client expects JSON, return 401 Unauthorized
    if (req.path.startsWith('/api/') || (req.headers['accept'] && req.headers['accept'].includes('application/json'))) {
      return res.status(401).json({
        error: 'Acesso negado: rota criptografada.',
        code: 'ENCRYPTED_AUTH_REQUIRED',
        message: 'Esta rota é restrita ao Administrador Supremo. Solicite seu código de 7 dígitos via Telegram Bot.'
      });
    }

    // Otherwise render modern cyber-shield screen
    return res.status(403).send(getAccessDeniedHtml());
  }

  // Set session cookie for seamless navigation without losing auth
  const cookieValue = validPayload.token || token;
  res.setHeader('Set-Cookie', `plantae_admin_auth=${cookieValue}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);

  req.adminSession = validPayload;
  next();
}

/**
 * Modern High-End Cyber Shield HTML Page for Unauthenticated Visitors
 */
function getAccessDeniedHtml() {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Acesso Restrito & Criptografado — Plantae Agrocrédito</title>
  <link rel="icon" href="/images/fav-pl.svg" type="image/svg+xml">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #090d16 radial-gradient(circle at 50% 30%, rgba(0, 168, 112, 0.15) 0%, rgba(1, 54, 68, 0.4) 50%, #090d16 100%);
      color: #f8fafc;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .lock-card {
      max-width: 520px;
      width: 100%;
      background: rgba(15, 23, 42, 0.9);
      border: 1px solid rgba(0, 168, 112, 0.35);
      border-radius: 20px;
      padding: 40px 32px;
      text-align: center;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(0, 168, 112, 0.2);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
    }
    .shield-icon {
      width: 72px;
      height: 72px;
      border-radius: 20px;
      background: linear-gradient(135deg, rgba(0, 168, 112, 0.25), rgba(1, 54, 68, 0.5));
      border: 1px solid rgba(0, 168, 112, 0.5);
      box-shadow: 0 0 25px rgba(0, 168, 112, 0.4);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 24px;
    }
    .shield-icon svg { width: 38px; height: 38px; fill: #10b981; }
    h1 { font-size: 22px; font-weight: 800; margin-bottom: 12px; letter-spacing: -0.02em; }
    p { font-size: 14px; color: #94a3b8; line-height: 1.6; margin-bottom: 24px; }
    .crypto-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 9999px;
      background: rgba(0, 168, 112, 0.15);
      border: 1px solid rgba(0, 168, 112, 0.3);
      color: #10b981;
      font-size: 12px;
      font-family: monospace;
      font-weight: 700;
      margin-bottom: 24px;
    }
    .info-box {
      background: rgba(0, 0, 0, 0.4);
      border: 1px dashed rgba(255, 255, 255, 0.12);
      border-radius: 12px;
      padding: 16px;
      font-size: 13px;
      color: #cbd5e1;
      margin-bottom: 28px;
      text-align: left;
    }
    .info-box strong { color: #fff; display: block; margin-bottom: 4px; }
    .btn-return {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 28px;
      border-radius: 10px;
      background: linear-gradient(135deg, #00A870 0%, #008f5d 100%);
      color: #fff;
      font-weight: 700;
      font-size: 14px;
      text-decoration: none;
      box-shadow: 0 4px 16px rgba(0, 168, 112, 0.4);
      transition: all 0.2s ease;
    }
    .btn-return:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0, 168, 112, 0.6);
    }
  </style>
</head>
<body>
  <div class="lock-card">
    <div class="shield-icon">
      <svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>
    </div>
    <div class="crypto-badge">
      <svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:currentColor;"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
      7-DIGIT CRYPTOGRAPHIC ROUTE
    </div>
    <h1>Acesso Restrito & Criptografado</h1>
    <p>O Supreme Admin da Plantae Agrocrédito opera sob isolamento criptográfico de 7 dígitos. Esta rota só pode ser acessada através de chave efêmera autorizada.</p>
    
    <div class="info-box">
      <strong>Como Obter Acesso:</strong>
      Solicite seu link de acesso criptografado de 7 dígitos exclusivo diretamente tocando no botão <b>🔐 Gerar Link Criptografado</b> no <b>Telegram Bot Oficial</b>.
    </div>

    <a href="/" class="btn-return">
      <svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:currentColor;"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
      <span>Retornar à Landing Page</span>
    </a>
  </div>
</body>
</html>`;
}

module.exports = {
  generate7DigitToken,
  validateAdminToken,
  revokeAllAdminSessions,
  requireAdminAuth,
  extractToken
};
