/**
 * Plantae Agrocrédito - Unified Vercel Serverless Function for Analytics & Lead Funnel Tracking
 * Handles:
 *   POST /api/track/event      → visitor entry, exit, and CTA click tracking with Telegram alerts
 *   POST /api/track/lead-step  → step-by-step lead funnel progression with Telegram alerts
 *
 * Telegram alerts are sent for:
 *   - output_whatsapp: lead clicked a WhatsApp CTA (full lead card + call button)
 *   - lead-step:       funnel step progression (25% / 50% / 75% / 100%)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// ─── Config Helpers ───────────────────────────────────────────────────────────

function getTelegramConfig() {
  let token = process.env.TELEGRAM_BOT_TOKEN || '';
  let chatId = process.env.TELEGRAM_ADMIN_CHAT_ID || '';

  // Primary: data/config.json (canonical write target in production)
  try {
    const dataPath = path.join(process.cwd(), 'data', 'config.json');
    if (fs.existsSync(dataPath)) {
      const config = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      token = config.telegram_bot_token || token;
      chatId = config.telegram_admin_id || chatId;
    }
  } catch (e) {}

  // Fallback: api/config.json (local dev)
  if (!token || !chatId) {
    try {
      const configPath = path.join(process.cwd(), 'api', 'config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        token = config.telegram_bot_token || token;
        chatId = config.telegram_admin_id || chatId;
      }
    } catch (e) {}
  }

  return { token, chatId };
}

function getActivePhone() {
  let phone = process.env.DEFAULT_WHATSAPP_NUMBER || '5518981115624';
  try {
    const dataPath = path.join(process.cwd(), 'data', 'config.json');
    if (fs.existsSync(dataPath)) {
      const config = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      if (config.whatsapp_number) phone = String(config.whatsapp_number).replace(/\D/g, '');
    }
  } catch (e) {}
  return phone;
}

// ─── Telegram Sender ──────────────────────────────────────────────────────────

function sendTelegramMessage(token, chatId, text, replyMarkup = null) {
  if (!token || !chatId) return;

  const payload = JSON.stringify({
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML',
    reply_markup: replyMarkup || undefined
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

// ─── Event Storage ────────────────────────────────────────────────────────────

function saveEvent(eventData) {
  try {
    const eventsPath = path.join(process.cwd(), 'data', 'events.json');
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    let events = [];
    if (fs.existsSync(eventsPath)) {
      try { events = JSON.parse(fs.readFileSync(eventsPath, 'utf8')); } catch (e) {}
    }
    if (!Array.isArray(events)) events = [];

    events.push({ ...eventData, created_at: new Date().toISOString() });
    // Keep last 500 events
    if (events.length > 500) events = events.slice(-500);
    fs.writeFileSync(eventsPath, JSON.stringify(events, null, 2), 'utf8');
  } catch (e) {}
}

// ─── Telegram Notifications ───────────────────────────────────────────────────

function formatDuration(seconds) {
  if (!seconds || seconds < 1) return 'menos de 1s';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function notifyWhatsAppLead(data) {
  const { token, chatId } = getTelegramConfig();
  if (!token || !chatId) return;

  const phone = getActivePhone();
  const hora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  // Traffic / UTM info
  const utmLine = data.utm_source
    ? `\n📡 <b>Origem:</b> <code>${data.utm_source}${data.utm_campaign ? ' / ' + data.utm_campaign : ''}</code>`
    : '';
  const refLine = data.referrer && data.referrer !== ''
    ? `\n🔗 <b>Referência:</b> <code>${String(data.referrer).substring(0, 80)}</code>`
    : '';
  const sessionLine = data.session_id
    ? `\n🔑 <b>Sessão:</b> <code>${data.session_id}</code>`
    : '';

  const msg =
    `🚀 <b>NOVO LEAD → WHATSAPP INICIADO</b> 🚀\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🎯 <b>Botão Clicado:</b> <code>${data.button_text || data.action_key || 'N/A'}</code>\n` +
    `🔑 <b>CTA Key:</b> <code>${data.action_key || 'N/A'}</code>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📱 <b>Dispositivo:</b> <code>${data.device || 'Desktop'}</code>\n` +
    `🖥️ <b>Sistema:</b> <code>${data.os || 'N/A'}</code>\n` +
    `🌐 <b>Browser:</b> <code>${data.browser || 'N/A'}</code>\n` +
    `⏱️ <b>Tempo no Site:</b> <code>${formatDuration(data.duration_seconds || 0)}</code>` +
    utmLine + refLine + sessionLine + `\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `⏰ <b>Horário:</b> ${hora}`;

  const inlineButtons = [
    [{ text: '💬 Abrir WhatsApp Plantae Agora', url: `https://wa.me/${phone}` }]
  ];

  sendTelegramMessage(token, chatId, msg, { inline_keyboard: inlineButtons });
}

function notifyLeadStepTelegram(data) {
  const { token, chatId } = getTelegramConfig();
  if (!token || !chatId) return;

  const phone = getActivePhone();
  const step = parseInt(data.step || data.step_number, 10) || 1;
  const progressBars = {
    1: '🟩⬜⬜⬜ (25%)',
    2: '🟩🟩⬜⬜ (50%)',
    3: '🟩🟩🟩⬜ (75%)',
    4: '🟩🟩🟩🟩 (100% CONCLUÍDO) 🔥'
  };
  const progressBar = progressBars[step] || '🟩⬜⬜⬜';

  const stepTitles = {
    1: '📋 Etapa 1 — Simulação de Valores',
    2: '🏢 Etapa 2 — Dados Cadastrais / CNPJ',
    3: '📄 Etapa 3 — Proposta Visualizada',
    4: '💬 Etapa 4 — WhatsApp VIP Iniciado'
  };
  const stepTitle = stepTitles[step] || `Etapa ${step}`;

  let msg =
    `🎯 <b>FUNIL DE LEADS — AVANÇO DETECTADO</b> 🎯\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📍 <b>Fase Atual:</b> <b>${stepTitle}</b>\n` +
    `📊 <b>Progresso:</b> <code>${progressBar}</code>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

  // Lead data
  if (data.lead_name || data.nome || data.name) {
    msg += `👤 <b>Nome:</b> <code>${data.lead_name || data.nome || data.name}</code>\n`;
  }
  if (data.lead_doc || data.documento || data.cnpj || data.document) {
    msg += `📋 <b>Documento:</b> <code>${data.lead_doc || data.documento || data.cnpj || data.document}</code>\n`;
  }
  if (data.company_name || data.razao_social) {
    msg += `🏢 <b>Empresa:</b> <code>${data.company_name || data.razao_social}</code>\n`;
  }
  if (data.lead_phone || data.telefone || data.whatsapp || data.phone) {
    msg += `📱 <b>WhatsApp do Lead:</b> <code>${data.lead_phone || data.telefone || data.whatsapp || data.phone}</code>\n`;
  }
  if (data.lead_city || data.cidade || data.location) {
    msg += `📍 <b>Localização:</b> <code>${data.lead_city || data.cidade || data.location}</code>\n`;
  }
  if (data.crop) {
    msg += `🌱 <b>Cultura:</b> <code>${data.crop}</code>\n`;
  }
  if (data.credit_value || data.valor) {
    msg += `💰 <b>Valor Desejado:</b> <code>${data.credit_value || data.valor}</code>\n`;
  }
  if (data.installments || data.parcelas) {
    msg += `🔢 <b>Prazo:</b> <code>${data.installments || data.parcelas}x (${data.frequency || data.frequencia || 'mensal'})</code>\n`;
  }
  if (data.estimated_installment) {
    msg += `💵 <b>Parcela Estimada:</b> <code>${data.estimated_installment}</code>\n`;
  }
  if (data.utm_source) {
    msg += `📡 <b>Origem:</b> <code>${data.utm_source}${data.utm_campaign ? ' / ' + data.utm_campaign : ''}</code>\n`;
  }
  if (data.device) {
    msg += `📱 <b>Dispositivo:</b> <code>${data.device}</code>\n`;
  }

  msg +=
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `⏰ <b>Horário:</b> ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`;

  // Inline button — call lead's WhatsApp if available
  let replyMarkup = null;
  const rawPhone = String(data.lead_phone || data.telefone || data.whatsapp || data.phone || '').replace(/\D/g, '');
  const inlineButtons = [];

  if (rawPhone.length >= 10) {
    const leadName = data.lead_name || data.nome || data.name || '';
    const waText = encodeURIComponent(`Olá${leadName ? ' ' + leadName : ''}! Recebemos sua simulação de crédito rural na Plantae Agrocrédito. Podemos conversar agora?`);
    inlineButtons.push([{ text: `💬 Chamar Lead${leadName ? ': ' + leadName : ''} no WhatsApp`, url: `https://wa.me/55${rawPhone}?text=${waText}` }]);
  }
  inlineButtons.push([{ text: '🌾 Abrir WhatsApp Plantae', url: `https://wa.me/${phone}` }]);
  replyMarkup = { inline_keyboard: inlineButtons };

  sendTelegramMessage(token, chatId, msg, replyMarkup);
}

// ─── Handler ──────────────────────────────────────────────────────────────────

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token, x-admin-gate, x-admin-pwd');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    let data = req.body || {};
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch (e) {}
    }

    const query = req.query || {};
    const isLeadStep = query.type === 'lead-step' || Boolean(data.step || data.step_number);

    if (isLeadStep) {
      notifyLeadStepTelegram(data);
      saveEvent({ ...data, type: 'lead_step' });
      return res.status(200).json({
        success: true,
        message: 'Lead step tracked and notified'
      });
    }

    // General tracking event — save to events.json
    const eventType = data.type || data.event || 'unknown';
    saveEvent(data);

    // Notify Telegram only for WhatsApp conversions (output_whatsapp)
    if (eventType === 'output_whatsapp') {
      notifyWhatsAppLead(data);
    }

    return res.status(200).json({
      success: true,
      event: eventType,
      recorded: true
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};
