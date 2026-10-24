/**
 * Plantae Agrocrédito - Vercel Serverless Function for CNPJ Consultation
 * Handles GET/POST /api/cnpj
 * Features:
 * - Mathematical checksum validation (no wasted credits on typos)
 * - Multi-token automatic failover & rotation
 * - Alert notifications to Supreme Admin via Telegram Bot
 * - Zero-disruption fallback to VIP WhatsApp for leads if credits deplete
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const DEFAULT_TOKENS = [
  '222246865PxcjWAuBRN401259976',
  '222251070HILFlZqkpd401267568',
  '222255275SslFjwCODP401275160'
];

function getStoredTokens() {
  try {
    const configPath = path.join(process.cwd(), 'api', 'config.json');
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (Array.isArray(data.cnpj_tokens) && data.cnpj_tokens.length > 0) {
        return {
          tokens: data.cnpj_tokens,
          activeIndex: parseInt(data.cnpj_active_index, 10) || 0
        };
      }
    }
  } catch (e) {}

  return {
    tokens: DEFAULT_TOKENS,
    activeIndex: 0
  };
}

function updateStoredActiveIndex(newIndex) {
  try {
    const configPath = path.join(process.cwd(), 'api', 'config.json');
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      data.cnpj_active_index = newIndex;
      fs.writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf8');
    }
  } catch (e) {}
}

function isValidCNPJ(cnpjRaw) {
  if (!cnpjRaw) return false;
  const cnpj = String(cnpjRaw).replace(/\D/g, '');
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1+$/.test(cnpj)) return false;

  let size = cnpj.length - 2;
  let numbers = cnpj.substring(0, size);
  const digits = cnpj.substring(size);
  let sum = 0;
  let pos = size - 7;
  for (let i = size; i >= 1; i--) {
    sum += Number(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== Number(digits.charAt(0))) return false;

  size = size + 1;
  numbers = cnpj.substring(0, size);
  sum = 0;
  pos = size - 7;
  for (let i = size; i >= 1; i--) {
    sum += Number(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== Number(digits.charAt(1))) return false;

  return true;
}

function cleanCNPJ(raw) {
  return String(raw || '').replace(/\D/g, '');
}

function formatCNPJ(digits) {
  const d = cleanCNPJ(digits);
  if (d.length !== 14) return digits;
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

async function queryHubCnpj(cnpjDigits, token, isTestOnly = false) {
  const url = `http://ws.hubdodesenvolvedor.com.br/v2/cnpj/?cnpj=${cnpjDigits}&token=${token}${isTestOnly ? '&last_update=2' : ''}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return await res.json();
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

function sendTelegramEmergencyAlert(cnpjFormatted, leadInfo = {}) {
  try {
    const configPath = path.join(process.cwd(), 'api', 'config.json');
    let token = process.env.TELEGRAM_BOT_TOKEN;
    let chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      token = config.telegram_bot_token || token;
      chatId = config.telegram_admin_id || chatId;
    }

    if (!token || !chatId) return;

    const msg = `🚨 <b>ALERTA CRÍTICO: TOKENS DE CNPJ ESGOTADOS!</b> 🚨\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `⚠️ <b>Atenção Administrador Supremo:</b> Todos os tokens de consulta da Receita Federal esgotaram o saldo de créditos ou falharam.\n\n` +
      `🏢 <b>CNPJ Consultado pelo Lead:</b> <code>${cnpjFormatted}</code>\n` +
      `👤 <b>Lead / Contato:</b> ${leadInfo.nome || leadInfo.name || 'Em atendimento no simulador'}\n` +
      `📱 <b>WhatsApp:</b> ${leadInfo.telefone || leadInfo.phone || 'Não preenchido'}\n` +
      `⏰ <b>Horário:</b> ${new Date().toLocaleString('pt-BR')}\n\n` +
      `🛡️ <b>Ação de Proteção:</b> O lead foi acolhido sem erros técnicos e direcionado para atendimento VIP no WhatsApp.\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `👉 <i>Acesse o Telegram Bot para recarregar ou trocar o token ativo.</i>`;

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

module.exports = async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let cnpjRaw = '';
  let leadInfo = {};

  if (req.method === 'GET') {
    cnpjRaw = req.query.cnpj || '';
  } else if (req.method === 'POST') {
    cnpjRaw = req.body.cnpj || '';
    leadInfo = req.body || {};
  } else {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const cnpjDigits = cleanCNPJ(cnpjRaw);

  if (!cnpjDigits) {
    return res.status(400).json({ success: false, message: 'CNPJ é obrigatório.' });
  }

  // 1. Mathematical Checksum Validation
  if (!isValidCNPJ(cnpjDigits)) {
    return res.status(200).json({
      success: false,
      valid: false,
      error_code: 'INVALID_MATH',
      message: 'O CNPJ informado possui dígitos verificadores incorretos.'
    });
  }

  const { tokens, activeIndex: initialIndex } = getStoredTokens();
  let activeIndex = initialIndex % tokens.length;
  let attempts = 0;
  const maxAttempts = tokens.length;

  while (attempts < maxAttempts) {
    const currentToken = tokens[activeIndex];
    try {
      const response = await queryHubCnpj(cnpjDigits, currentToken, false);

      if (response && response.return === 'OK') {
        if (activeIndex !== initialIndex) {
          updateStoredActiveIndex(activeIndex);
        }

        return res.status(200).json({
          ok: true,
          success: true,
          valid: true,
          result: response.result,
          data: response.result,
          consumed: response.consumed || 1,
          token_index: activeIndex
        });
      }

      const msg = response && (response.message || response.msg || '');
      const isBalanceError = msg.includes('sem saldo') || 
                             msg.includes('Token Inválido') || 
                             msg.includes('Token Bloqueado') || 
                             msg.includes('Limite Excedido');

      if (isBalanceError) {
        activeIndex = (activeIndex + 1) % tokens.length;
        attempts++;
        continue;
      }

      return res.status(200).json({
        ok: false,
        success: false,
        valid: false,
        error_code: 'NOT_FOUND',
        message: msg || 'CNPJ não encontrado na base de dados da Receita Federal.'
      });
    } catch (err) {
      activeIndex = (activeIndex + 1) % tokens.length;
      attempts++;
    }
  }

  // ALL TOKENS EXHAUSTED
  sendTelegramEmergencyAlert(formatCNPJ(cnpjDigits), leadInfo);

  return res.status(200).json({
    ok: false,
    success: false,
    valid: true,
    credits_exhausted: true,
    fallback_whatsapp: true,
    message: 'Serviço de consulta externa em manutenção programada. Redirecionando para atendimento VIP no WhatsApp.'
  });
};
