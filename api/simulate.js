/**
 * Plantae Agrocrédito - Vercel Serverless Function for Credit Simulation
 * Handles POST /api/simulate
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
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const body = req.body || {};
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

  // Asynchronous telegram alert
  sendTelegramAlert(body);

  return res.status(200).json({
    success: true,
    redirect_url: redirectUrl,
    whatsapp_number: phone,
    message: waText
  });
};
