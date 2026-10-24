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
  try {
    const configPath = path.join(process.cwd(), 'api', 'config.json');
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (data && data.whatsapp_number) {
        return String(data.whatsapp_number).replace(/\D/g, '');
      }
    }
  } catch (e) {}

  try {
    const dataConfigPath = path.join(process.cwd(), 'data', 'config.json');
    if (fs.existsSync(dataConfigPath)) {
      const data = JSON.parse(fs.readFileSync(dataConfigPath, 'utf8'));
      if (data && data.whatsapp_number) {
        return String(data.whatsapp_number).replace(/\D/g, '');
      }
    }
  } catch (e) {}

  return DEFAULT_PHONE;
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

function sendTelegramAlert(simData) {
  try {
    const configPath = path.join(process.cwd(), 'api', 'config.json');
    if (!fs.existsSync(configPath)) return;
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const token = config.telegram_bot_token || process.env.TELEGRAM_BOT_TOKEN;
    const chatId = config.telegram_admin_id || process.env.TELEGRAM_ADMIN_CHAT_ID;

    if (!token || !chatId) return;

    const msg = `🌾 <b>NOVA SIMULAÇÃO DE CRÉDITO RURAL (PJ/PF)</b> 🌾\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🏢 <b>Empresa / Razão:</b> <code>${simData.company_name || 'Não informado'}</code>\n` +
      `📋 <b>Documento:</b> <code>${simData.document || 'Não informado'}</code>\n` +
      `👤 <b>Responsável:</b> <code>${simData.name || 'Não informado'}</code>\n` +
      `📞 <b>WhatsApp:</b> <code>${simData.phone || 'Não informado'}</code>\n` +
      `📧 <b>E-mail:</b> <code>${simData.email || 'Não informado'}</code>\n` +
      `📍 <b>Localização:</b> <code>${simData.location || 'Não informado'}</code>\n` +
      `🌱 <b>Cultura:</b> <code>${simData.crop || 'Não informado'}</code>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💰 <b>Valor Solicitado:</b> <code>R$ ${simData.credit_value}</code>\n` +
      `🔢 <b>Plano:</b> <code>${simData.installments}x (${simData.frequency})</code>\n` +
      `💵 <b>Estimativa Parcela:</b> <code>R$ ${simData.estimated_installment}</code>\n` +
      `📊 <b>Total Estimado:</b> <code>R$ ${simData.total_amount}</code>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `⏰ <b>Horário:</b> ${new Date().toLocaleString('pt-BR')}`;

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
  } catch (e) {}
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
    saveSimulation(body);
    sendTelegramAlert(body);

    return res.status(200).json({
      success: true,
      redirect_url: redirectUrl,
      whatsapp_number: phone,
      message: waText
    });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};
