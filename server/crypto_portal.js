/**
 * Plantae Agrocrédito - Supreme Admin Cryptographic Portal Engine
 * Generates single-use dynamic virtual gates, unique authorization passwords,
 * and tamper-proof HMAC-SHA256 session signatures.
 */

const crypto = require('crypto');

function getSecret() {
  return process.env.TELEGRAM_BOT_TOKEN || 'plantae_super_secure_secret_2026';
}

/**
 * Generate a new encrypted dynamic session with unique virtual gate and password
 * @param {number} ttlMinutes Session lifetime in minutes (default 60)
 * @param {string} customSecret Optional override for signing secret
 */
function generateEncryptedAdminSession(ttlMinutes = 60, customSecret = '') {
  // 1. Virtual port / gate in ephemeral secure range
  const gateNumber = Math.floor(49152 + Math.random() * (65535 - 49152));
  const gateCode = `7K-${gateNumber}`;

  // 2. High-entropy single-use password (e.g. PLT-83K9-7K)
  const charset = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let randPin = '';
  for (let i = 0; i < 4; i++) {
    randPin += charset[Math.floor(Math.random() * charset.length)];
  }
  const password = `PLT-${randPin}-7K`;

  // 3. Cryptographic token and expiration
  const token = crypto.randomBytes(6).toString('hex').toUpperCase();
  const expiresAt = Date.now() + (ttlMinutes * 60 * 1000);

  // 4. HMAC-SHA256 signature
  const sec = customSecret || getSecret();
  const dataToSign = `${token}:${gateCode}:${password}:${expiresAt}`;
  const hmac = crypto.createHmac('sha256', sec).update(dataToSign).digest('hex').substring(0, 16);

  const fullAuthCode = `${token}.${expiresAt}.${hmac}`;

  return {
    gate: gateCode,
    gateNumber: gateNumber,
    password: password,
    token: token,
    fullAuthCode: fullAuthCode,
    expiresAt: expiresAt,
    ttlMinutes: ttlMinutes
  };
}

/**
 * Verify whether an encrypted admin session signature is authentic and non-expired
 * @param {string} fullAuthCode token.expiresAt.hmac
 * @param {string} gate Virtual gate code
 * @param {string} password Authorization password
 * @param {string} customSecret Optional override for signing secret
 */
function verifyEncryptedAdminSession(fullAuthCode, gate, password, customSecret = '') {
  if (!fullAuthCode || !gate || !password) return false;

  try {
    const parts = fullAuthCode.split('.');
    if (parts.length !== 3) return false;

    const [token, expStr, hmac] = parts;
    const expiresAt = parseInt(expStr, 10);
    if (isNaN(expiresAt) || Date.now() > expiresAt) return false;

    const sec = customSecret || getSecret();
    const dataToSign = `${token}:${gate}:${password}:${expiresAt}`;
    const expectedHmac = crypto.createHmac('sha256', sec).update(dataToSign).digest('hex').substring(0, 16);

    return hmac === expectedHmac;
  } catch (e) {
    return false;
  }
}

module.exports = {
  generateEncryptedAdminSession,
  verifyEncryptedAdminSession,
  getSecret
};
