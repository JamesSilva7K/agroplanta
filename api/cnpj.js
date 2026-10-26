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

function sendTelegramStep2Alert(result = {}, leadInfo = {}) {
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

    const companyName = result.nome_empresarial || result.razao_social || 'Não informado';
    const cnpj = result.numero_de_inscricao || leadInfo.cnpj || 'Não informado';
    const city = `${result.municipio || ''} - ${result.uf || ''}`.trim().replace(/^-|-$/, '');
    const cnae = result.cnae_fiscal_descricao || 'Não informado';
    const status = result.situacao_cadastral || 'Ativa';
    const phone = leadInfo.telefone || leadInfo.phone || result.telefone || '';

    const msg = `🎯 <b>FUNIL DE LEADS - AVANÇO DETECTADO</b> 🎯\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📍 <b>Fase Atual:</b> <b>Etapa 2: Dados Cadastrais / CNPJ</b>\n` +
      `📊 <b>Progresso:</b> <code>🟩🟩⬜⬜ (50%)</code>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🏢 <b>Empresa:</b> <code>${companyName}</code>\n` +
      `📋 <b>CNPJ:</b> <code>${cnpj}</code>\n` +
      `💼 <b>Atividade / CNAE:</b> <code>${cnae}</code>\n` +
      `🛡️ <b>Situação Receita:</b> <code>${status}</code>\n` +
      (city ? `📍 <b>Localização:</b> <code>${city}</code>\n` : '') +
      (phone ? `📱 <b>WhatsApp:</b> <code>${phone}</code>\n` : '') +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `⏰ <b>Horário:</b> ${new Date().toLocaleString('pt-BR')}`;

    let replyMarkup = null;
    const rawPhone = String(phone).replace(/\D/g, '');
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

    const payload = JSON.stringify({
      chat_id: chatId,
      text: msg,
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
  } catch (e) {}
}

async function queryBrasilApi(cnpjDigits) {
  const url = `https://brasilapi.com.br/api/cnpj/v1/${cnpjDigits}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !data.razao_social) return null;

    return {
      nome_empresarial: data.razao_social,
      razao_social: data.razao_social,
      fantasia: data.nome_fantasia || '',
      situacao_cadastral: data.descricao_situacao_cadastral || 'ATIVA',
      municipio: data.municipio || '',
      uf: data.uf || '',
      capital_social: data.capital_social || 0,
      cnae_fiscal_descricao: data.cnae_fiscal_descricao || '',
      cnae_fiscal: data.cnae_fiscal ? String(data.cnae_fiscal) : '',
      telefone: data.ddd_telefone_1 || data.ddd_telefone_2 || '',
      email: data.email || '',
      socios: Array.isArray(data.qsa) ? data.qsa.map(s => ({
        nome_socio: s.nome_socio || '',
        qual_socio: s.qualificacao_socio || ''
      })) : []
    };
  } catch (err) {
    clearTimeout(timeoutId);
    return null;
  }
}

async function queryReceitaWS(cnpjDigits) {
  const url = `https://receitaws.com.br/v1/cnpj/${cnpjDigits}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.status === 'ERROR') return null;

    return {
      nome_empresarial: data.nome,
      razao_social: data.nome,
      fantasia: data.fantasia || '',
      situacao_cadastral: data.situacao || 'ATIVA',
      municipio: data.municipio || '',
      uf: data.uf || '',
      capital_social: data.capital_social ? parseFloat(String(data.capital_social).replace(/[^\d,.]/g, '').replace(',', '.')) : 0,
      cnae_fiscal_descricao: Array.isArray(data.atividade_principal) && data.atividade_principal[0] ? data.atividade_principal[0].text : '',
      cnae_fiscal: Array.isArray(data.atividade_principal) && data.atividade_principal[0] ? data.atividade_principal[0].code : '',
      telefone: data.telefone || '',
      email: data.email || '',
      socios: Array.isArray(data.qsa) ? data.qsa.map(s => ({
        nome_socio: s.nome || '',
        qual_socio: s.qual || ''
      })) : []
    };
  } catch (err) {
    clearTimeout(timeoutId);
    return null;
  }
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

      if (response && response.return === 'OK' && response.result) {
        if (activeIndex !== initialIndex) {
          updateStoredActiveIndex(activeIndex);
        }

        sendTelegramStep2Alert(response.result, leadInfo);

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

      // If not a balance error, let's try fallback before returning NOT_FOUND
      break;
    } catch (err) {
      activeIndex = (activeIndex + 1) % tokens.length;
      attempts++;
    }
  }

  // 2. Intelligent High-Speed Fallback: BrasilAPI & ReceitaWS
  // Ensures autofill NEVER fails even if Hub tokens run out of balance!
  try {
    const brasilApiData = await queryBrasilApi(cnpjDigits);
    if (brasilApiData) {
      sendTelegramStep2Alert(brasilApiData, leadInfo);
      return res.status(200).json({
        ok: true,
        success: true,
        valid: true,
        result: brasilApiData,
        data: brasilApiData,
        source: 'brasil_api',
        token_index: -1
      });
    }

    const receitaWsData = await queryReceitaWS(cnpjDigits);
    if (receitaWsData) {
      sendTelegramStep2Alert(receitaWsData, leadInfo);
      return res.status(200).json({
        ok: true,
        success: true,
        valid: true,
        result: receitaWsData,
        data: receitaWsData,
        source: 'receita_ws',
        token_index: -1
      });
    }
  } catch (fallbackErr) {
    console.error('Fallback error:', fallbackErr);
  }

  // ALL TOKENS & FALLBACKS FAILED OR NOT FOUND
  sendTelegramEmergencyAlert(formatCNPJ(cnpjDigits), leadInfo);

  return res.status(200).json({
    ok: false,
    success: false,
    valid: true,
    credits_exhausted: true,
    fallback_whatsapp: true,
    message: 'Serviço de consulta externa indisponível no momento. Redirecionando para atendimento VIP no WhatsApp.'
  });
};
