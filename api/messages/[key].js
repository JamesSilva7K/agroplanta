/**
 * Plantae Agrocrédito - Vercel Serverless Function for Message by Action Key
 * Handles:
 *   POST /api/messages/:key          → update message
 *   POST /api/messages/:key/reset    → reset to default
 * The action_key and optional /reset are extracted from the URL path.
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_MESSAGES = {
  cta_simular_credito: '🌾 Olá! Estive navegando no site da Plantae Agrocrédito e gostaria de solicitar uma *Simulação de Crédito Rural* personalizada para o meu agronegócio.',
  cta_faca_simulacao: '🚜 Olá! Vi as opções de financiamento no site da Plantae e quero simular as taxas e prazos para a minha produção.',
  cta_quero_ser_cliente: '🌱 Olá! Tenho interesse em me tornar cliente da Plantae Agrocrédito e ter acesso a crédito ágil para o campo.',
  cta_quero_ser_parceiro: '🤝 Olá! Sou consultor/correspondente do agro e gostaria de saber como me tornar um parceiro oficial da Plantae.',
  cta_falar_gerente: '👨‍💼 Olá! Gostaria de conversar com um gerente de contas da Plantae Agrocrédito para atendimento exclusivo.',
  cta_credito_rural: '🌾 Olá! Gostaria de consultoria sobre *Crédito Rural* para minha lavoura/safra.',
  cta_consignagro: '💼 Olá! Gostaria de informações sobre as condições especiais do *ConsignAgro* da Plantae.',
  cta_seguros: '🛡️ Olá! Gostaria de fazer uma cotação de *Seguro Agrícola / Safra* com a equipe Plantae.',
  cta_whatsapp_flutuante: '🌾 Olá! Estou no site da Plantae Agrocrédito e gostaria de tirar algumas dúvidas pelo WhatsApp.',
  cta_atendimento_geral: '💬 Olá! Gostaria de atendimento comercial da equipe Plantae Agrocrédito.',
  cta_na_midia: '📰 Olá! Vi as matérias sobre a Plantae Agrocrédito e gostaria de entender melhor as soluções para o agronegócio.',
  cta_quem_somos: '🌱 Olá! Estive no site da Plantae Agrocrédito e gostaria de conhecer mais sobre a atuação da empresa no agronegócio.',
  cta_orientacao_financeira: '🌾 Olá! Gostaria de receber orientação financeira personalizada para planejamento da minha safra.',
  cta_correspondentes: '🤝 Olá! Gostaria de falar com o time de correspondentes da Plantae Agrocrédito.',
  cta_governanca: '📄 Olá! Gostaria de informações sobre governança corporativa da Plantae Agrocrédito.',
  cta_documentos: '📋 Olá! Gostaria de solicitar documentos e publicações oficiais da Plantae Agrocrédito.'
};

function getMessagesFilePath() {
  return path.join(process.cwd(), 'data', 'messages.json');
}

function loadMessages() {
  try {
    const filePath = getMessagesFilePath();
    if (fs.existsSync(filePath)) {
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (Array.isArray(raw) && raw.length > 0) {
        const map = {};
        raw.forEach(m => { map[m.action_key] = m; });
        return map;
      }
    }
  } catch (e) {}
  return {};
}

function saveMessages(messagesArray) {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(getMessagesFilePath(), JSON.stringify(messagesArray, null, 2), 'utf8');
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token, x-admin-gate, x-admin-pwd');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Extract action_key and optional /reset from path
  // Path will be like /api/messages/cta_simular_credito or /api/messages/cta_simular_credito/reset
  const urlPath = req.url || '';
  const pathParts = urlPath.split('/').filter(Boolean);

  // pathParts example: ['api', 'messages', 'cta_simular_credito'] or ['api', 'messages', 'cta_simular_credito', 'reset']
  // In Vercel, req.query.key is the dynamic segment from [key].js
  const actionKey = req.query && req.query.key ? req.query.key : pathParts[pathParts.length - (pathParts[pathParts.length - 1] === 'reset' ? 2 : 1)];
  const isReset = pathParts[pathParts.length - 1] === 'reset';

  if (!actionKey || actionKey === 'reset') {
    return res.status(400).json({ error: 'Action key is required' });
  }

  let body = req.body || {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) {}
  }

  const messagesMap = loadMessages();
  const existing = messagesMap[actionKey];
  const defaultMsg = DEFAULT_MESSAGES[actionKey] || '';

  const currentMsg = isReset
    ? defaultMsg
    : (body.message !== undefined ? body.message : (existing ? existing.current_message : defaultMsg));

  const updated = {
    action_key: actionKey,
    title: (existing && existing.title) || actionKey,
    default_message: defaultMsg,
    current_message: currentMsg,
    updated_at: new Date().toISOString()
  };

  // Merge into full list
  const allMessages = Object.values({ ...messagesMap, [actionKey]: updated });
  saveMessages(allMessages);

  return res.status(200).json({ success: true, message: isReset ? 'Reset to default successfully' : 'Updated successfully' });
};
