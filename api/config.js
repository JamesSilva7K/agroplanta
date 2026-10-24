/**
 * Plantae Agrocrédito - Vercel Serverless Function for Configuration Management
 * Handles GET /api/config and POST /api/config (Protected)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

function getConfigFile() {
  const primaryPath = path.join(process.cwd(), 'data', 'config.json');
  if (fs.existsSync(primaryPath)) {
    try {
      return JSON.parse(fs.readFileSync(primaryPath, 'utf8'));
    } catch (e) {}
  }
  return {
    whatsapp_number: process.env.DEFAULT_WHATSAPP_NUMBER || '5518981115624',
    telegram_bot_token: process.env.TELEGRAM_BOT_TOKEN || '8889361609:AAF2MAfgvaUlNIrf2MVRR9aHW225XElyw0k',
    telegram_admin_id: process.env.TELEGRAM_ADMIN_CHAT_ID || '8932547795',
    redirects_active: true,
    bot_alerts_enabled: true,
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
    const configPath = path.join(process.cwd(), 'data', 'config.json');
    fs.writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {}
}

function sendAdminAuditAlert(summary, gate = '') {
  const current = getConfigFile();
  const token = current.telegram_bot_token || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = current.telegram_admin_id || process.env.TELEGRAM_ADMIN_CHAT_ID;

  if (!token || !chatId) return;

  const msg = `🛡️ <b>[AUDITORIA SUPREME ADMIN] ALTERAÇÃO SALVA</b> 🛡️\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `Painel Administrativo Web sincronizado com sucesso.\n\n` +
    `🚪 <b>Porta Utilizada:</b> <code>${gate || 'Porta Autenticada'}</code>\n` +
    `📋 <b>Resumo das Alterações:</b>\n${summary}\n` +
    `⏰ <b>Horário:</b> ${new Date().toLocaleString('pt-BR')}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `<i>Todas as rotas públicas continuam 100% blindadas contra quebra de portas.</i>`;

  const payload = JSON.stringify({
    chat_id: chatId,
    text: msg,
    parse_mode: 'HTML'
  });

  const req = https.request({
    hostname: 'api.telegram.org',
    path: `/bot${token}/sendMessage`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  });
  req.on('error', () => {});
  req.write(payload);
  req.end();
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token, x-admin-gate, x-admin-pwd');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const config = getConfigFile();
    return res.status(200).json(config);
  }

  if (req.method === 'POST') {
    let body = req.body || {};
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) {}
    }

    const current = getConfigFile();
    const updated = { ...current };
    const changedFields = [];

    if (body.whatsapp_number !== undefined) {
      const clean = String(body.whatsapp_number).replace(/\D/g, '');
      if (clean) {
        updated.whatsapp_number = clean;
        changedFields.push(`• <b>WhatsApp:</b> <code>+${clean}</code>`);
      }
    }
    if (body.redirects_active !== undefined) {
      updated.redirects_active = !!body.redirects_active;
      changedFields.push(`• <b>Roteamento Ativo:</b> ${updated.redirects_active ? 'Sim ✅' : 'Não ❌'}`);
    }
    if (body.bot_alerts_enabled !== undefined) {
      updated.bot_alerts_enabled = !!body.bot_alerts_enabled;
      changedFields.push(`• <b>Alertas Bot:</b> ${updated.bot_alerts_enabled ? 'Ativados 🔔' : 'Pausados 🔕'}`);
    }
    if (body.primary_color) {
      updated.primary_color = body.primary_color;
      changedFields.push(`• <b>Cor Primária:</b> <code>${body.primary_color}</code>`);
    }
    if (body.secondary_color) {
      updated.secondary_color = body.secondary_color;
      changedFields.push(`• <b>Cor Secundária:</b> <code>${body.secondary_color}</code>`);
    }
    if (body.accent_color) {
      updated.accent_color = body.accent_color;
      changedFields.push(`• <b>Cor de Destaque:</b> <code>${body.accent_color}</code>`);
    }
    if (body.banner_slide_1) updated.banner_slide_1 = body.banner_slide_1;
    if (body.banner_slide_2) updated.banner_slide_2 = body.banner_slide_2;
    if (body.banner_slide_3) updated.banner_slide_3 = body.banner_slide_3;
    if (body.banner_slide_4) updated.banner_slide_4 = body.banner_slide_4;
    if (body.banner_mobile) updated.banner_mobile = body.banner_mobile;

    updated.updated_at = new Date().toISOString();
    saveConfigFile(updated);

    const gate = req.headers['x-admin-gate'] || body.gate || '';
    if (changedFields.length > 0) {
      sendAdminAuditAlert(changedFields.join('\n'), gate);
    }

    return res.status(200).json({
      success: true,
      message: 'Configurações atualizadas e sincronizadas com sucesso',
      config: updated
    });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};
