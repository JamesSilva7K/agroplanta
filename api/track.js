/**
 * Plantae Agrocrédito - Unified Vercel Serverless Function for Analytics & Lead Funnel Tracking
 * Handles:
 *   POST /api/track/event      → general visitor and CTA click event tracking
 *   POST /api/track/lead-step  → step-by-step lead funnel progression with Telegram alerts
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

function getTelegramConfig() {
  let token = process.env.TELEGRAM_BOT_TOKEN;
  let chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

  try {
    const configPath = path.join(process.cwd(), 'api', 'config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      token = config.telegram_bot_token || token;
      chatId = config.telegram_admin_id || chatId;
    }
  } catch (e) {}

  return { token, chatId };
}

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

function notifyLeadStepTelegram(data) {
  const { token, chatId } = getTelegramConfig();
  if (!token || !chatId) return;

  const step = parseInt(data.step, 10) || 1;
  const progressBars = {
    1: '🟩⬜⬜⬜ (25%)',
    2: '🟩🟩⬜⬜ (50%)',
    3: '🟩🟩🟩⬜ (75%)',
    4: '🟩🟩🟩🟩 (100% CONCLUÍDO)'
  };
  const progressBar = progressBars[step] || '🟩⬜⬜⬜';

  const stepTitles = {
    1: 'Etapa 1: Simulação de Valores',
    2: 'Etapa 2: Dados Cadastrais / CNPJ',
    3: 'Etapa 3: Proposta Visualizada',
    4: 'Etapa 4: Contato VIP WhatsApp Iniciado'
  };
  const stepTitle = stepTitles[step] || `Etapa ${step}`;

  let msg = `🎯 <b>FUNIL DE LEADS - AVANÇO DETECTADO</b> 🎯\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📍 <b>Fase Atual:</b> <b>${stepTitle}</b>\n` +
    `📊 <b>Progresso:</b> <code>${progressBar}</code>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

  if (data.lead_name || data.nome) {
    msg += `👤 <b>Nome:</b> <code>${data.lead_name || data.nome}</code>\n`;
  }
  if (data.lead_doc || data.documento || data.cnpj) {
    msg += `📋 <b>Documento:</b> <code>${data.lead_doc || data.documento || data.cnpj}</code>\n`;
  }
  if (data.company_name || data.razao_social) {
    msg += `🏢 <b>Empresa:</b> <code>${data.company_name || data.razao_social}</code>\n`;
  }
  if (data.lead_phone || data.telefone || data.whatsapp) {
    msg += `📱 <b>WhatsApp:</b> <code>${data.lead_phone || data.telefone || data.whatsapp}</code>\n`;
  }
  if (data.lead_city || data.cidade) {
    msg += `📍 <b>Localização:</b> <code>${data.lead_city || data.cidade}</code>\n`;
  }
  if (data.credit_value || data.valor) {
    msg += `💰 <b>Valor Desejado:</b> <code>R$ ${data.credit_value || data.valor}</code>\n`;
  }
  if (data.installments || data.parcelas) {
    msg += `🔢 <b>Prazo:</b> <code>${data.installments || data.parcelas}x (${data.frequency || data.frequencia || 'mensal'})</code>\n`;
  }

  msg += `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `⏰ <b>Horário:</b> ${new Date().toLocaleString('pt-BR')}`;

  let replyMarkup = null;
  const rawPhone = String(data.lead_phone || data.telefone || data.whatsapp || '').replace(/\D/g, '');
  if (rawPhone.length >= 10) {
    replyMarkup = {
      inline_keyboard: [
        [
          {
            text: '💬 Chamar Lead no WhatsApp',
            url: `https://wa.me/55${rawPhone}?text=Ol%C3%A1%2C+recebemos+sua+solicita%C3%A7%C3%A3o+de+cr%C3%A9dito+rural+na+Plantae+Agro!`
          }
        ]
      ]
    };
  }

  sendTelegramMessage(token, chatId, msg, replyMarkup);
}

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
    const isLeadStep = query.type === 'lead-step' || Boolean(data.step);

    if (isLeadStep) {
      notifyLeadStepTelegram(data);
      return res.status(200).json({
        success: true,
        message: 'Lead step tracked successfully'
      });
    }

    // General tracking event
    return res.status(200).json({
      success: true,
      event: data.type || data.event || 'unknown',
      recorded: true
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};
