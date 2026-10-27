/**
 * Plantae Agrocrédito - Vercel Serverless Function & Universal WhatsApp Router
 * Handles /r/whatsapp?action=... and redirects to the dynamic WhatsApp number
 * configured by the Telegram Bot in api/config.json.
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_PHONE = process.env.DEFAULT_WHATSAPP_NUMBER || '5518981115624';

const CONTEXT_MESSAGES = {
  cta_simular_credito: '🌾 Olá! Gostaria de simular as taxas e condições de Crédito Rural para a minha propriedade.',
  cta_faca_simulacao: '🌾 Olá! Gostaria de fazer uma simulação de Crédito Rural com um gerente Plantae.',
  cta_falar_gerente: '🌾 Olá! Gostaria de falar com um gerente da Plantae Agrocrédito sobre financiamento.',
  cta_credito_rural: '🌾 Olá! Gostaria de mais informações sobre as linhas de Crédito Rural da Plantae.',
  cta_consignagro: '🌾 Olá! Gostaria de conhecer o ConsignAgro e as condições para o agronegócio.',
  cta_seguros: '🌾 Olá! Gostaria de informações sobre os Seguros Agrícolas e Rurais da Plantae.',
  cta_quem_somos: '🌾 Olá! Gostaria de conhecer mais sobre a história e os serviços da Plantae Agrocrédito.',
  cta_orientacao_financeira: '🌾 Olá! Gostaria de orientações financeiras sobre planejamento de safra e crédito.',
  cta_governanca: '🌾 Olá! Gostaria de solicitar informações de governança da Plantae Agrocrédito.',
  cta_documentos: '🌾 Olá! Gostaria de consultar documentos e publicações oficiais da Plantae Agrocrédito.',
  cta_correspondentes: '🌾 Olá! Gostaria de informações sobre os correspondentes autorizados da Plantae.',
  cta_na_midia: '🌾 Olá! Vi a matéria sobre a Plantae Agrocrédito e gostaria de atendimento.',
  cta_quero_ser_parceiro: '🌾 Olá! Gostaria de ser um parceiro comercial ou correspondente da Plantae Agrocrédito.',
  cta_quero_ser_cliente: '🌾 Olá! Tenho interesse em ser cliente da Plantae e acessar recursos livres.',
  cta_acesse_conta: '🌾 Olá! Gostaria de suporte para acessar a minha conta ou consultar meus dados na Plantae Agrocrédito.',
  cta_atendimento_geral: '🌾 Olá! Gostaria de atendimento da equipe Plantae Agrocrédito.'
};

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

  // Fallback: api/config.json (local dev copy)
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

const FALLBACK_BOT_TOKEN = '8889361609:AAF2MAfgvaUlNIrf2MVRR9aHW225XElyw0k';
const FALLBACK_CHAT_ID = '8932547795';

function getTelegramConfig() {
  let token = process.env.TELEGRAM_BOT_TOKEN || '';
  let chatId = process.env.TELEGRAM_ADMIN_CHAT_ID || '';

  try {
    const dataConfigPath = path.join(process.cwd(), 'data', 'config.json');
    if (fs.existsSync(dataConfigPath)) {
      const data = JSON.parse(fs.readFileSync(dataConfigPath, 'utf8'));
      token = data.telegram_bot_token || token;
      chatId = data.telegram_admin_id || chatId;
    }
  } catch (e) {}

  if (!token || !chatId) {
    try {
      const configPath = path.join(process.cwd(), 'api', 'config.json');
      if (fs.existsSync(configPath)) {
        const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        token = data.telegram_bot_token || token;
        chatId = data.telegram_admin_id || chatId;
      }
    } catch (e) {}
  }

  if (!token) token = FALLBACK_BOT_TOKEN;
  if (!chatId) chatId = FALLBACK_CHAT_ID;

  return { token, chatId };
}

async function sendTelegramWhatsAppAlert(actionKey, message, phone, req) {
  try {
    const { token, chatId } = getTelegramConfig();
    if (!token || !chatId) return;

    const query = req.query || {};
    const userAgent = req.headers ? (req.headers['user-agent'] || '') : '';
    const device = /mobile|iphone|android|tablet|ipad/i.test(userAgent) ? '📱 Mobile' : '💻 Desktop';
    const utmSource = query.utm_source ? `\n📡 <b>Origem (UTM):</b> <code>${query.utm_source}${query.utm_campaign ? ' / ' + query.utm_campaign : ''}</code>` : '';
    const buttonText = query.btn ? `\n🔘 <b>Botão Clicado:</b> <code>${query.btn}</code>` : '';
    const sessionId = query.sid ? `\n🔑 <b>Sessão:</b> <code>${query.sid}</code>` : '';

    const actionNames = {
      cta_simular_credito: 'Simular Crédito Rural',
      cta_faca_simulacao: 'Fazer Simulação de Crédito',
      cta_falar_gerente: 'Falar com Gerente Plantae',
      cta_credito_rural: 'Crédito Rural',
      cta_consignagro: 'ConsignAgro',
      cta_seguros: 'Seguros Rurais',
      cta_quem_somos: 'Quem Somos',
      cta_orientacao_financeira: 'Orientação Financeira',
      cta_governanca: 'Governança',
      cta_documentos: 'Documentos e Publicações',
      cta_correspondentes: 'Correspondentes',
      cta_na_midia: 'Na Mídia',
      cta_quero_ser_parceiro: 'Quero Ser Parceiro',
      cta_quero_ser_cliente: 'Quero Ser Cliente',
      cta_acesse_conta: 'Acesse Sua Conta / Internet Banking',
      cta_atendimento_geral: 'Atendimento Geral Plantae',
      cta_whatsapp_flutuante: 'Botão Flutuante do WhatsApp'
    };

    const actionLabel = actionNames[actionKey] || actionKey;
    const hora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    const msg =
      `🟢 <b>CLIQUE NO WHATSAPP DETECTADO</b> 🟢\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🎯 <b>Ação / Motivo:</b> <b>${actionLabel}</b>\n` +
      `📱 <b>Dispositivo:</b> ${device}\n` +
      `📞 <b>Número de Destino:</b> <code>${phone}</code>` +
      buttonText + utmSource + sessionId + `\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💬 <b>Mensagem Pré-configurada:</b>\n<i>"${message}"</i>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `⏰ <b>Horário:</b> ${hora}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: msg,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🌾 Abrir Conversa no WhatsApp', url: `https://wa.me/${phone}` }]
          ]
        }
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
  } catch (err) {
    // Silently continue to not break the user's redirect
  }
}

module.exports = async function handler(req, res) {
  const query = req.query || {};
  const actionKey = query.action || 'cta_atendimento_geral';
  const phone = getActivePhone();

  let message = query.msg || CONTEXT_MESSAGES[actionKey] || CONTEXT_MESSAGES.cta_atendimento_geral;

  const encodedMsg = encodeURIComponent(message);
  const targetUrl = `https://wa.me/${phone}?text=${encodedMsg}`;

  // Notify Supreme Admin via Telegram before resolving response
  await sendTelegramWhatsAppAlert(actionKey, message, phone, req);

  // If request expects JSON
  if (req.headers && req.headers.accept && req.headers.accept.includes('application/json')) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({
      success: true,
      redirect_url: targetUrl,
      phone: phone,
      action: actionKey,
      message: message
    });
  }

  // HTTP 302 Redirect
  res.writeHead(302, { Location: targetUrl });
  res.end();
};
