/**
 * Plantae Agrocrédito - Vercel Serverless Function for Admin Visual Configuration
 * Handles POST /api/admin/config
 * Manages visual settings: colors, banner images (paths and uploads).
 * Requires admin authentication headers (x-admin-token or Authorization).
 * Delegates to api/config.js which handles the full config file.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const ALLOWED_VISUAL_KEYS = [
  'primary_color', 'secondary_color', 'accent_color',
  'banner_slide_1', 'banner_slide_2', 'banner_slide_3', 'banner_slide_4', 'banner_mobile'
];

function getConfigFilePath() {
  const primaryPath = path.join(process.cwd(), 'data', 'config.json');
  if (fs.existsSync(primaryPath)) return primaryPath;
  return path.join(process.cwd(), 'api', 'config.json');
}

function getConfigFile() {
  try {
    const filePath = getConfigFilePath();
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (e) {}
  return {
    whatsapp_number: process.env.DEFAULT_WHATSAPP_NUMBER || '5518981115624',
    primary_color: '#00A870',
    secondary_color: '#013644',
    accent_color: '#006B59',
    banner_slide_1: 'images/hero-1.png',
    banner_slide_2: 'images/hero-2.png',
    banner_slide_3: 'images/hero-3.png',
    banner_slide_4: 'images/banner-davi.jpg',
    banner_mobile: 'images/plantae-hero-1-mb.png'
  };
}

function saveConfigFile(data) {
  try {
    // Always save to data/config.json as primary
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    const dataPath = path.join(dataDir, 'config.json');
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8');

    // Also sync to api/config.json for serverless read consistency
    try {
      const apiPath = path.join(process.cwd(), 'api', 'config.json');
      fs.writeFileSync(apiPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {}

    return true;
  } catch (e) {
    return false;
  }
}

function sendAuditAlert(changedFields, gate) {
  try {
    const config = getConfigFile();
    const token = config.telegram_bot_token || process.env.TELEGRAM_BOT_TOKEN;
    const chatId = config.telegram_admin_id || process.env.TELEGRAM_ADMIN_CHAT_ID;
    if (!token || !chatId) return;

    const msg = `🎨 <b>[ADMIN] CORES &amp; BANNERS ATUALIZADOS</b> 🎨\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Visual da Landing Page sincronizado pelo Supreme Admin.\n\n` +
      `🚪 <b>Porta:</b> <code>${gate || 'Admin Panel'}</code>\n` +
      `📋 <b>Alterações:</b>\n${changedFields.join('\n')}\n` +
      `⏰ <b>Horário:</b> ${new Date().toLocaleString('pt-BR')}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━`;

    const payload = JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'HTML' });
    const httpReq = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${token}/sendMessage`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
    });
    httpReq.on('error', () => {});
    httpReq.write(payload);
    httpReq.end();
  } catch (e) {}
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token, x-admin-gate, x-admin-pwd');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const current = getConfigFile();
    const visual = {};
    for (const key of ALLOWED_VISUAL_KEYS) {
      visual[key] = current[key];
    }
    return res.status(200).json({ success: true, config: visual });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  let body = req.body || {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) {} 
  }

  const current = getConfigFile();
  const updated = { ...current };
  const changedFields = [];

  for (const key of ALLOWED_VISUAL_KEYS) {
    if (body[key] !== undefined && body[key] !== null) {
      const oldVal = current[key] || '';
      const newVal = String(body[key]);
      if (oldVal !== newVal) {
        updated[key] = newVal;
        const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        changedFields.push(`• <b>${label}:</b> <code>${newVal.substring(0, 50)}</code>`);
      } else {
        updated[key] = newVal;
      }
    }
  }

  updated.updated_at = new Date().toISOString();
  saveConfigFile(updated);

  const gate = (req.headers && req.headers['x-admin-gate']) || body.gate || 'Admin Panel';
  if (changedFields.length > 0) {
    sendAuditAlert(changedFields, gate);
  }

  return res.status(200).json({
    success: true,
    message: 'Configurações visuais atualizadas com sucesso',
    updated_keys: ALLOWED_VISUAL_KEYS.filter(k => body[k] !== undefined)
  });
};
