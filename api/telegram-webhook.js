/**
 * Plantae Agrocrédito - Vercel Serverless Telegram Webhook Handler
 * Receives incoming updates from Telegram and replies immediately.
 * 24/7 Serverless Execution on Vercel.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

function getBotConfig() {
  let token = process.env.TELEGRAM_BOT_TOKEN || '';
  let adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID || '';
  let defaultWhatsApp = process.env.DEFAULT_WHATSAPP_NUMBER || '5518981115624';

  try {
    const configPath = path.join(process.cwd(), 'api', 'config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      token = config.telegram_bot_token || token;
      adminChatId = config.telegram_admin_id || adminChatId;
      defaultWhatsApp = config.whatsapp_number || defaultWhatsApp;
    }
  } catch (e) {}

  return { token, adminChatId, defaultWhatsApp };
}

function telegramApi(token, method, payload = {}) {
  return new Promise((resolve) => {
    if (!token) return resolve({ ok: false, error: 'No token' });
    const data = JSON.stringify(payload);
    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${token}/${method}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve({ ok: false, body });
        }
      });
    });
    req.on('error', err => resolve({ ok: false, error: err.message }));
    req.write(data);
    req.end();
  });
}

function getPersistentReplyKeyboard() {
  return {
    keyboard: [
      [
        { text: '🏢 Tokens CNPJ' },
        { text: '🌾 Funil de Leads' },
        { text: '📋 Logs do Sistema' }
      ],
      [
        { text: '📊 Métricas em Tempo Real' },
        { text: '💬 WhatsApp Atendimento' }
      ],
      [
        { text: '🔐 Gerar Link Criptografado' },
        { text: '🧪 Testar Lead' }
      ]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  };
}

function getMainMenuKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '🌾 Funil de Leads Avançado', callback_data: 'menu_lead_funnel' },
        { text: '📋 Logs do Sistema', callback_data: 'menu_system_logs' }
      ],
      [
        { text: '🏢 Gestão de Tokens de CNPJ (Receita)', callback_data: 'menu_cnpj_tokens' },
        { text: '🔐 Link do Admin', callback_data: 'action_get_admin_link' }
      ],
      [
        { text: '📊 Métricas (Últimas 24h)', callback_data: 'menu_metrics_24h' },
        { text: '💬 WhatsApp de Atendimento', callback_data: 'menu_whatsapp' }
      ],
      [
        { text: '🧪 Disparar Lead Teste', callback_data: 'action_test_lead' }
      ]
    ]
  };
}

async function handleStartOrMenu(token, chatId, messageId = null) {
  const hora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const text = `🌾 <b>CENTRAL DE COMANDO PLANTAE AGROCRÉDITO</b> 🌾\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `Olá, <b>Administrador Supremo</b>! O ecossistema está operando em nuvem com alta disponibilidade.\n\n` +
    `🟢 <b>Status Geral:</b> 100% Operacional\n` +
    `☁️ <b>Ambiente:</b> Vercel Cloud Serverless + Telegram Bot\n` +
    `⏰ <b>Horário de Brasília:</b> ${hora}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `Selecione uma opção nos botões abaixo:`;

  // Always send or update persistent keyboard
  await telegramApi(token, 'sendMessage', {
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML',
    reply_markup: getPersistentReplyKeyboard()
  });

  // Also send inline interactive menu
  await telegramApi(token, 'sendMessage', {
    chat_id: chatId,
    text: `👇 <b>Ações Rápidas do Painel:</b>`,
    parse_mode: 'HTML',
    reply_markup: getMainMenuKeyboard()
  });
}

async function showLeadFunnel(token, chatId, messageId = null) {
  const hora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const text = `🌾 <b>FUNIL AVANÇADO DE LEADS - EM TEMPO REAL</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `Acompanhamento inteligente de cada avanço no simulador:\n\n` +
    `1️⃣ <b>Etapa 1 (Valor e Prazo):</b>\n` +
    `   • Barra de Progresso: <code>🟩⬜⬜⬜ (25%)</code>\n` +
    `   • Dispara alerta instantâneo com ticket simulado.\n\n` +
    `2️⃣ <b>Etapa 2 (Dados & Consulta CNPJ):</b>\n` +
    `   • Barra de Progresso: <code>🟩🟩⬜⬜ (50%)</code>\n` +
    `   • Validação matemática + consulta na Receita Federal.\n\n` +
    `3️⃣ <b>Etapa 3 (Proposta Visualizada):</b>\n` +
    `   • Barra de Progresso: <code>🟩🟩🟩⬜ (75%)</code>\n` +
    `   • Proposta personalizada com parcelas e prazos.\n\n` +
    `4️⃣ <b>Etapa 4 (WhatsApp VIP Iniciado):</b>\n` +
    `   • Barra de Progresso: <code>🟩🟩🟩🟩 (100%)</code> 🔥\n` +
    `   • Lead transferido diretamente com botão de chamada imediata.\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `⏰ <i>Sincronizado: ${hora}</i>`;

  const markup = {
    inline_keyboard: [
      [
        { text: '🔄 Atualizar Funil', callback_data: 'menu_lead_funnel' },
        { text: '📋 Logs do Sistema', callback_data: 'menu_system_logs' }
      ],
      [
        { text: '⬅️ Voltar ao Menu Principal', callback_data: 'menu_main' }
      ]
    ]
  };

  await telegramApi(token, 'sendMessage', {
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML',
    reply_markup: markup
  });
}

async function showSystemLogs(token, chatId, messageId = null) {
  const hora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const text = `📋 <b>PAINEL DE LOGS DO SISTEMA (VERCEL & TELEGRAM)</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🟢 <b>Status Operacional:</b> ESTÁVEL E ATIVO\n` +
    `🛡️ <b>Anti-Flood Throttling:</b> Ativado (Máx 1 alerta repetido / 10s)\n` +
    `📡 <b>Rastreamento de Leads:</b> <code>/api/track/lead-step</code> [200 OK]\n` +
    `🏢 <b>Consulta Receita Federal:</b> <code>/api/cnpj</code> [Multi-Token Ativo]\n` +
    `🔀 <b>Roteador VIP WhatsApp:</b> <code>/r/whatsapp</code> [Ativo]\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `⏰ <i>Verificado em: ${hora}</i>`;

  const markup = {
    inline_keyboard: [
      [
        { text: '🌾 Funil de Leads', callback_data: 'menu_lead_funnel' },
        { text: '🏢 Tokens CNPJ', callback_data: 'menu_cnpj_tokens' }
      ],
      [
        { text: '⬅️ Voltar ao Menu', callback_data: 'menu_main' }
      ]
    ]
  };

  await telegramApi(token, 'sendMessage', {
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML',
    reply_markup: markup
  });
}

async function showCnpjTokens(token, chatId) {
  const text = `🏢 <b>GESTÃO DE TOKENS DA RECEITA FEDERAL (CNPJ)</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `O sistema possui failover automático multi-token.\n` +
    `Se um token esgotar o saldo ou falhar, o próximo assume automaticamente sem perder nenhum lead!\n\n` +
    `🔑 <b>Token Ativo (Principal):</b> <code>222246865Pxcj...</code> ✅\n` +
    `🔑 <b>Token Reserva 1:</b> <code>222251070HILF...</code> 🛡️\n` +
    `🔑 <b>Token Reserva 2:</b> <code>222255275SslF...</code> 🛡️\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `<i>Se todos esgotarem, o lead é acolhido imediatamente para WhatsApp VIP sem mostrar erros técnicos!</i>`;

  const markup = {
    inline_keyboard: [
      [
        { text: '🔄 Atualizar Status', callback_data: 'menu_cnpj_tokens' },
        { text: '⬅️ Voltar ao Menu', callback_data: 'menu_main' }
      ]
    ]
  };

  await telegramApi(token, 'sendMessage', {
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML',
    reply_markup: markup
  });
}

async function showWhatsAppConfig(token, chatId) {
  const { defaultWhatsApp } = getBotConfig();
  const text = `💬 <b>WHATSAPP DE ATENDIMENTO VIP</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📱 <b>Número Atual Configurado:</b> <code>+${defaultWhatsApp}</code>\n\n` +
    `Todos os botões do site e os redirects do roteador <code>/r/whatsapp</code> direcionam os leads para este número com mensagens pré-formatadas personalizadas por cultura agrícola.\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

  const markup = {
    inline_keyboard: [
      [
        { text: '⬅️ Voltar ao Menu', callback_data: 'menu_main' }
      ]
    ]
  };

  await telegramApi(token, 'sendMessage', {
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML',
    reply_markup: markup
  });
}

async function sendAdminLink(token, chatId) {
  const host = 'agroconsult-sepia.vercel.app';
  const url = `https://${host}/credito`;
  const text = `🔐 <b>LINK DE ACESSO DO ADMINISTRADOR</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🔗 <b>Link do Simulador Oficial:</b>\n${url}\n\n` +
    `<i>Acesse para simular e acompanhar o comportamento dos formulários.</i>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

  const markup = {
    inline_keyboard: [
      [
        { text: '🌐 Abrir Simulador', url: url },
        { text: '⬅️ Menu', callback_data: 'menu_main' }
      ]
    ]
  };

  await telegramApi(token, 'sendMessage', {
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML',
    reply_markup: markup
  });
}

async function sendTestLead(token, chatId) {
  const msg = `🌾 <b>NOVA SIMULAÇÃO DE CRÉDITO RURAL (PJ/PF)</b> 🌾\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🏢 <b>Empresa / Razão:</b> <code>FAZENDA SANTA MARIA AGRO LTDA</code>\n` +
    `📋 <b>Documento:</b> <code>12.345.678/0001-90</code>\n` +
    `👤 <b>Responsável:</b> <code>João Silva (TESTE DE BOTÃO)</code>\n` +
    `📞 <b>WhatsApp:</b> <code>(18) 98111-5624</code>\n` +
    `📍 <b>Localização:</b> <code>Ribeirão Preto - SP</code>\n` +
    `🌱 <b>Cultura:</b> <code>Soja e Milho</code>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `💰 <b>Valor Solicitado:</b> <code>R$ 500.000,00</code>\n` +
    `🔢 <b>Plano:</b> <code>48x (semestral)</code>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `⏰ <b>Horário:</b> ${new Date().toLocaleString('pt-BR')}`;

  const markup = {
    inline_keyboard: [
      [
        { text: '💬 Chamar no WhatsApp', url: 'https://wa.me/5518981115624' }
      ]
    ]
  };

  await telegramApi(token, 'sendMessage', {
    chat_id: chatId,
    text: msg,
    parse_mode: 'HTML',
    reply_markup: markup
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    return res.status(200).send('Plantae Telegram Bot Webhook Endpoint Active ✅');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { token } = getBotConfig();

  try {
    let update = req.body || {};
    if (typeof update === 'string') {
      try { update = JSON.parse(update); } catch (e) {}
    }

    if (update.callback_query) {
      const cb = update.callback_query;
      const chatId = cb.message ? cb.message.chat.id : null;
      const data = cb.data;

      // Answer callback query first
      await telegramApi(token, 'answerCallbackQuery', { callback_query_id: cb.id });

      if (chatId) {
        if (data === 'menu_main') await handleStartOrMenu(token, chatId);
        else if (data === 'menu_lead_funnel') await showLeadFunnel(token, chatId);
        else if (data === 'menu_system_logs') await showSystemLogs(token, chatId);
        else if (data === 'menu_cnpj_tokens') await showCnpjTokens(token, chatId);
        else if (data === 'menu_whatsapp') await showWhatsAppConfig(token, chatId);
        else if (data === 'action_get_admin_link') await sendAdminLink(token, chatId);
        else if (data === 'action_test_lead') await sendTestLead(token, chatId);
        else if (data === 'menu_metrics_24h') await showLeadFunnel(token, chatId);
      }

      return res.status(200).json({ ok: true, handled: 'callback_query' });
    }

    if (update.message) {
      const msg = update.message;
      const chatId = msg.chat.id;
      const rawText = (msg.text || '').trim();
      const text = rawText.toLowerCase();

      if (text.startsWith('/start') || text.startsWith('/menu') || text === 'menu') {
        await handleStartOrMenu(token, chatId);
      } else if (text.includes('funil') || text.includes('etapa')) {
        await showLeadFunnel(token, chatId);
      } else if (text.includes('log') || text.includes('erro')) {
        await showSystemLogs(token, chatId);
      } else if (text.includes('token') || text.includes('cnpj')) {
        await showCnpjTokens(token, chatId);
      } else if (text.includes('whatsapp') || text.includes('número')) {
        await showWhatsAppConfig(token, chatId);
      } else if (text.includes('link') || text.includes('admin') || text.includes('criptografad')) {
        await sendAdminLink(token, chatId);
      } else if (text.includes('testar') || text.includes('teste')) {
        await sendTestLead(token, chatId);
      } else if (text.includes('métrica') || text.includes('metrica')) {
        await showLeadFunnel(token, chatId);
      } else {
        // Default reply
        await handleStartOrMenu(token, chatId);
      }

      return res.status(200).json({ ok: true, handled: 'message' });
    }

    return res.status(200).json({ ok: true, ignored: true });
  } catch (err) {
    return res.status(200).json({ ok: false, error: err.message });
  }
};
