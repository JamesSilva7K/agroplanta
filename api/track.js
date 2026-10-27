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

const FALLBACK_BOT_TOKEN = '8889361609:AAF2MAfgvaUlNIrf2MVRR9aHW225XElyw0k';
const FALLBACK_CHAT_ID = '8932547795';

// ─── Config Helpers ───────────────────────────────────────────────────────────

function getTelegramConfig() {
  let token = process.env.TELEGRAM_BOT_TOKEN || '';
  let chatId = process.env.TELEGRAM_ADMIN_CHAT_ID || '';

  // Primary: data/config.json
  try {
    const dataPath = path.join(process.cwd(), 'data', 'config.json');
    if (fs.existsSync(dataPath)) {
      const config = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      token = config.telegram_bot_token || token;
      chatId = config.telegram_admin_id || chatId;
    }
  } catch (e) {}

  // Secondary: api/config.json
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

  if (!token) token = FALLBACK_BOT_TOKEN;
  if (!chatId) chatId = FALLBACK_CHAT_ID;

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
  try {
    const apiPath = path.join(process.cwd(), 'api', 'config.json');
    if (fs.existsSync(apiPath)) {
      const config = JSON.parse(fs.readFileSync(apiPath, 'utf8'));
      if (config.whatsapp_number) phone = String(config.whatsapp_number).replace(/\D/g, '');
    }
  } catch (e) {}
  return phone;
}

// ─── Telegram Sender ──────────────────────────────────────────────────────────

async function sendTelegramMessage(token, chatId, text, replyMarkup = null) {
  if (!token || !chatId) return;

  const payload = {
    chat_id      : chatId,
    text         : text,
    parse_mode   : 'HTML',
    reply_markup : replyMarkup || undefined
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
  } catch (err) {
    clearTimeout(timeoutId);
  }
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
    if (events.length > 500) events = events.slice(-500);
    fs.writeFileSync(eventsPath, JSON.stringify(events, null, 2), 'utf8');
  } catch (e) {}
}

// ─── Formatting ───────────────────────────────────────────────────────────────

function formatDuration(seconds) {
  if (!seconds || seconds < 1) return 'menos de 1s';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

// Throttle leve (5 segundos) apenas para evitar múltiplos pings acidentais idênticos
const recentSessions = new Map();
const THROTTLE_MS = 5000;

function canNotify(sessionId, type) {
  if (!sessionId) return true;
  const now = Date.now();
  const rec = recentSessions.get(sessionId) || {};
  const last = rec[type] || 0;
  if (now - last < THROTTLE_MS) return false;
  rec[type] = now;
  recentSessions.set(sessionId, rec);
  if (recentSessions.size > 500) {
    for (const [sid, r] of recentSessions.entries()) {
      if (now - Math.max(r.input || 0, r.exit || 0) > 300000) recentSessions.delete(sid);
    }
  }
  return true;
}

// ─── Notificações Telegram ───────────────────────────────────────────────────

async function notifyPageInput(data) {
  const { token, chatId } = getTelegramConfig();
  if (!token || !chatId) return;
  if (!canNotify(data.session_id, 'input')) return;

  const hora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  const utmLine = data.utm_source
    ? `\n📡 <b>Origem:</b> <code>${data.utm_source}${data.utm_campaign ? ' / ' + data.utm_campaign : ''}</code>`
    : '';
  const refLine = data.referrer && data.referrer !== ''
    ? `\n🔗 <b>Referência:</b> <code>${String(data.referrer).substring(0, 80)}</code>`
    : '';
  const pageLine = data.button_text
    ? `\n📄 <b>Página:</b> <code>${data.button_text}</code>`
    : '';

  const msg =
    `👀 <b>NOVO VISITANTE — ENTRADA NO SITE</b> 👀\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📱 <b>Dispositivo:</b> <code>${data.device || 'Desktop'}</code>\n` +
    `🖥️ <b>Sistema:</b> <code>${data.os || 'N/A'}</code>` +
    pageLine + utmLine + refLine + `\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `⏰ <b>Horário:</b> ${hora}`;

  await sendTelegramMessage(token, chatId, msg);
}

async function notifyPageExit(data) {
  const { token, chatId } = getTelegramConfig();
  if (!token || !chatId) return;
  if (!canNotify(data.session_id, 'exit')) return;

  const hora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  const utmLine = data.utm_source
    ? `\n📡 <b>Origem:</b> <code>${data.utm_source}${data.utm_campaign ? ' / ' + data.utm_campaign : ''}</code>`
    : '';

  const msg =
    `🚪 <b>VISITANTE SAIU DO SITE</b> 🚪\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `⏱️ <b>Tempo no Site:</b> <code>${formatDuration(data.duration_seconds || 0)}</code>\n` +
    `📱 <b>Dispositivo:</b> <code>${data.device || 'Desktop'}</code>` +
    utmLine + `\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `⏰ <b>Horário:</b> ${hora}`;

  await sendTelegramMessage(token, chatId, msg);
}

async function notifyButtonClick(data) {
  const { token, chatId } = getTelegramConfig();
  if (!token || !chatId) return;

  const hora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const buttonName = data.button_text || data.action_key || data.target_text || 'Botão';
  const ctaKey = data.action_key || data.key || 'N/A';

  const utmLine = data.utm_source
    ? `\n📡 <b>Origem:</b> <code>${data.utm_source}${data.utm_campaign ? ' / ' + data.utm_campaign : ''}</code>`
    : '';

  const msg =
    `⚡ <b>CLIQUE EM BOTÃO DETECTADO</b> ⚡\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🖱️ <b>Botão:</b> <code>${buttonName}</code>\n` +
    `🔑 <b>Identificador / CTA:</b> <code>${ctaKey}</code>\n` +
    `📱 <b>Dispositivo:</b> <code>${data.device || 'Desktop'}</code>\n` +
    `⏱️ <b>Tempo na Página:</b> <code>${formatDuration(data.duration_seconds || 0)}</code>` +
    utmLine + `\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `⏰ <b>Horário:</b> ${hora}`;

  await sendTelegramMessage(token, chatId, msg);
}

async function notifyWhatsAppLead(data) {
  const { token, chatId } = getTelegramConfig();
  if (!token || !chatId) return;

  const phone = getActivePhone();
  const hora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  const utmLine = data.utm_source
    ? `\n📡 <b>Origem:</b> <code>${data.utm_source}${data.utm_campaign ? ' / ' + data.utm_campaign : ''}</code>`
    : '';

  const msg =
    `🚀 <b>LEAD CLICOU NO WHATSAPP</b> 🚀\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🎯 <b>Botão Clicado:</b> <code>${data.button_text || data.action_key || 'WhatsApp'}</code>\n` +
    `🔑 <b>Ação / CTA:</b> <code>${data.action_key || 'cta_atendimento_geral'}</code>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📱 <b>Dispositivo:</b> <code>${data.device || 'Desktop'}</code>\n` +
    `⏱️ <b>Tempo no Site:</b> <code>${formatDuration(data.duration_seconds || 0)}</code>` +
    utmLine + `\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `⏰ <b>Horário:</b> ${hora}`;

  const inlineButtons = [
    [{ text: '💬 Abrir Conversa no WhatsApp', url: `https://wa.me/${phone}` }]
  ];

  await sendTelegramMessage(token, chatId, msg, { inline_keyboard: inlineButtons });
}

async function notifyLeadStepTelegram(data) {
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
  if (data.email || data.lead_email) {
    msg += `📧 <b>E-mail:</b> <code>${data.email || data.lead_email}</code>\n`;
  }
  if (data.lead_city || data.cidade || data.location) {
    msg += `📍 <b>Localização:</b> <code>${data.lead_city || data.cidade || data.location}</code>\n`;
  }
  if (data.crop) {
    msg += `🌱 <b>Cultura:</b> <code>${data.crop}</code>\n`;
  }
  if (data.revenue) {
    msg += `📊 <b>Faturamento / Porte:</b> <code>${data.revenue}</code>\n`;
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
  if (data.total_amount) {
    msg += `💵 <b>Total Estimado:</b> <code>${data.total_amount}</code>\n`;
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

  await sendTelegramMessage(token, chatId, msg, replyMarkup);
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

async function parseBody(req) {
  if (req.body) {
    if (Buffer.isBuffer(req.body)) {
      try { return JSON.parse(req.body.toString('utf8')); } catch (e) {}
    } else if (typeof req.body === 'string') {
      try { return JSON.parse(req.body); } catch (e) {}
    } else if (typeof req.body === 'object') {
      return req.body;
    }
  }
  return new Promise((resolve) => {
    let chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      try {
        const str = Buffer.concat(chunks).toString('utf8');
        resolve(str ? JSON.parse(str) : {});
      } catch (e) {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

module.exports = async function handler(req, res) {
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
    const data = await parseBody(req);
    const query = req.query || {};
    const isLeadStep = query.type === 'lead-step' || Boolean(data.step || data.step_number);

    if (isLeadStep) {
      await notifyLeadStepTelegram(data);
      saveEvent({ ...data, type: 'lead_step' });
      return res.status(200).json({
        success: true,
        message: 'Lead step tracked and notified'
      });
    }

    // General tracking event
    const eventType = data.type || data.event || 'unknown';
    saveEvent(data);

    // Notificações Telegram por tipo de evento
    if (eventType === 'output_whatsapp') {
      await notifyWhatsAppLead(data);
    } else if (eventType === 'input' || eventType === 'page_view') {
      await notifyPageInput(data);
    } else if (eventType === 'exit') {
      await notifyPageExit(data);
    } else if (eventType.includes('simulation') || eventType.includes('simulacao')) {
      await notifyButtonClick({ ...data, button_text: data.button_text || 'Simulação de Crédito' });
    } else if (eventType.includes('click') || eventType.includes('cta') || data.action_key) {
      await notifyButtonClick(data);
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
