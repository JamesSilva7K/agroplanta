/**
 * Plantae Agrocrédito - Unified Vercel Serverless Function for Credit Simulation
 * Handles:
 *   POST /api/simulate       → calculates proposal, sends telegram alert, logs simulation
 *   GET  /api/simulations    → returns simulation history for admin
 *   POST /api/simulations   → registers/appends a simulation entry
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const DEFAULT_PHONE = process.env.DEFAULT_WHATSAPP_NUMBER || '5518981115624';

function getActivePhone() {
  // Primary: data/config.json (canonical write target in production)
  try {
    const dataConfigPath = path.join(process.cwd(), 'data', 'config.json');
    if (fs.existsSync(dataConfigPath)) {
      const data = JSON.parse(fs.readFileSync(dataConfigPath, 'utf8'));
      if (data && data.whatsapp_number) {
        return String(data.whatsapp_number).replace(/\D/g, '');
      }
    }
  } catch (e) {}

  // Fallback: api/config.json (local dev)
  try {
    const configPath = path.join(process.cwd(), 'api', 'config.json');
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (data && data.whatsapp_number) {
        return String(data.whatsapp_number).replace(/\D/g, '');
      }
    }
  } catch (e) {}

  return DEFAULT_PHONE;
}

function getTelegramConfig() {
  let token = process.env.TELEGRAM_BOT_TOKEN || '';
  let chatId = process.env.TELEGRAM_ADMIN_CHAT_ID || '';

  try {
    const dataPath = path.join(process.cwd(), 'data', 'config.json');
    if (fs.existsSync(dataPath)) {
      const config = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      token = config.telegram_bot_token || token;
      chatId = config.telegram_admin_id || chatId;
    }
  } catch (e) {}

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

function sendTelegramRequest(token, payload) {
  return new Promise((resolve) => {
    const data = JSON.stringify(payload);
    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${token}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      res.on('data', () => {});
      res.on('end', () => resolve());
    });
    req.on('error', () => resolve());
    req.write(data);
    req.end();
  });
}

function sendTelegramAlert(simData, phone) {
  try {
    const { token, chatId } = getTelegramConfig();
    if (!token || !chatId) return;

    // Calculate total amount
    const creditRaw = String(simData.credit_value || '0').replace(/[^\d,]/g, '').replace(',', '.');
    const creditNum = parseFloat(creditRaw) || 0;
    const installmentRaw = String(simData.estimated_installment || '0').replace(/[^\d,]/g, '').replace(',', '.');
    const installmentNum = parseFloat(installmentRaw) || 0;
    const installmentsCount = parseInt(simData.installments, 10) || 0;
    const totalAmount = installmentNum > 0 && installmentsCount > 0
      ? (installmentNum * installmentsCount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : 'Não calculado';

    // UTM / traffic source
    const utmInfo = simData.utm_source ? `\n📡 <b>Origem:</b> <code>${simData.utm_source}${simData.utm_campaign ? ' / ' + simData.utm_campaign : ''}</code>` : '';
    const deviceInfo = simData.device ? `\n📱 <b>Dispositivo:</b> <code>${simData.device}</code>` : '';
    const sessionInfo = simData.session_id ? `\n🔑 <b>Sessão:</b> <code>${simData.session_id}</code>` : '';

    const msg = `🌾 <b>NOVA SIMULAÇÃO DE CRÉDITO RURAL</b> 🌾\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🏢 <b>Empresa / Razão:</b> <code>${simData.company_name || 'Não informado'}</code>\n` +
      `📋 <b>Documento:</b> <code>${simData.document || 'Não informado'}</code>\n` +
      `👤 <b>Responsável:</b> <code>${simData.name || 'Não informado'}</code>\n` +
      `📞 <b>WhatsApp do Lead:</b> <code>${simData.phone || 'Não informado'}</code>\n` +
      `📧 <b>E-mail:</b> <code>${simData.email || 'Não informado'}</code>\n` +
      `📍 <b>Localização:</b> <code>${simData.location || 'Não informado'}</code>\n` +
      `🌱 <b>Cultura:</b> <code>${simData.crop || 'Não informado'}</code>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💰 <b>Valor Solicitado:</b> <code>${simData.credit_value || 'Não informado'}</code>\n` +
      `🔢 <b>Plano:</b> <code>${simData.installments}x (${simData.frequency})</code>\n` +
      `💵 <b>Estimativa por Parcela:</b> <code>${simData.estimated_installment || 'Não calculado'}</code>\n` +
      `📊 <b>Total Estimado:</b> <code>${totalAmount}</code>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━` +
      utmInfo + deviceInfo + sessionInfo +
      `\n⏰ <b>Horário:</b> ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━`;

    // Build inline keyboard — call lead's WhatsApp if available, else business WhatsApp
    const inlineButtons = [];
    const rawLeadPhone = String(simData.phone || '').replace(/\D/g, '');
    const businessPhone = phone || DEFAULT_PHONE;

    if (rawLeadPhone.length >= 10) {
      const leadWaText = encodeURIComponent(`Olá ${simData.name || ''}! Recebemos sua simulação de crédito rural de ${simData.credit_value} no site da Plantae Agrocrédito. Podemos conversar?`);
      inlineButtons.push([{ text: `💬 Chamar Lead: ${simData.name || 'Lead'} no WhatsApp`, url: `https://wa.me/55${rawLeadPhone}?text=${leadWaText}` }]);
    }
    inlineButtons.push([{ text: `🌾 Abrir WhatsApp Plantae`, url: `https://wa.me/${businessPhone}` }]);

    const payload = {
      chat_id: chatId,
      text: msg,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: inlineButtons }
    };

    sendTelegramRequest(token, payload);
  } catch (e) {}
}

function getSimulationsFilePath() {
  return path.join(process.cwd(), 'data', 'simulations.json');
}

function loadSimulations(limit = 50) {
  try {
    const filePath = getSimulationsFilePath();
    if (fs.existsSync(filePath)) {
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (Array.isArray(raw)) {
        return raw.slice(-limit).reverse();
      }
    }
  } catch (e) {}
  return [];
}

function saveSimulation(sim) {
  try {
    const existing = loadSimulations(200).reverse();
    existing.push({ ...sim, id: Date.now(), created_at: new Date().toISOString() });
    const trimmed = existing.slice(-200);
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(getSimulationsFilePath(), JSON.stringify(trimmed, null, 2), 'utf8');
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token, x-admin-gate, x-admin-pwd');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const query = req.query || {};

  // GET: simulations list
  if (req.method === 'GET') {
    const limit = parseInt(query.limit || '50', 10);
    const simulations = loadSimulations(limit);
    return res.status(200).json({
      success: true,
      simulations,
      total: simulations.length
    });
  }

  if (req.method === 'POST') {
    let body = req.body || {};
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) {}
    }

    // Direct simulation logging route (?simulations=true)
    if (query.simulations === 'true' || query.list === 'true') {
      saveSimulation(body);
      return res.status(200).json({ success: true });
    }

    // Standard credit simulation calculation
    const phone = getActivePhone();
    const name = body.name || 'Produtor Rural';
    const company = body.company_name || 'Empresa Agro';
    const document = body.document || '';
    const creditValue = body.credit_value || 0;
    const installments = body.installments || 0;
    const frequency = body.frequency || 'Semestral';
    const installmentVal = body.estimated_installment || 0;

    const waText = 
      `🌾 Olá! Sou *${name}* da empresa *${company}*${document ? ` (${document})` : ''}.\n` +
      `Realizei uma simulação de Crédito Rural no site da Plantae:\n\n` +
      `💰 *Valor Solicitado:* R$ ${creditValue}\n` +
      `🔢 *Prazo:* ${installments}x (${frequency})\n` +
      `💵 *Parcela Estimada:* R$ ${installmentVal}\n` +
      (body.location ? `📍 *Localização:* ${body.location}\n` : '') +
      (body.crop ? `🌱 *Cultura:* ${body.crop}\n\n` : '\n') +
      `Gostaria de dar continuidade à análise da proposta e falar com um consultor!`;

    const redirectUrl = `https://wa.me/${phone}?text=${encodeURIComponent(waText)}`;

    // Save simulation to history & send telegram alert
    saveSimulation({ ...body, whatsapp_message: waText });
    sendTelegramAlert({ ...body, whatsapp_message: waText }, phone);

    return res.status(200).json({
      success: true,
      redirect_url: redirectUrl,
      whatsapp_number: phone,
      message: waText
    });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};
