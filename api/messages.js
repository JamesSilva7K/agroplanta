/**
 * Plantae Agrocrédito - Vercel Serverless Function for Context Messages
 * Handles GET /api/messages (list all) and POST /api/messages (save a specific message)
 * Data is persisted to data/messages.json with fallback to defaults.
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_MESSAGES = [
  { action_key: 'cta_simular_credito', title: 'Simular Crédito (Topo / Cabeçalho)', default_message: '🌾 Olá! Estive navegando no site da Plantae Agrocrédito e gostaria de solicitar uma *Simulação de Crédito Rural* personalizada para o meu agronegócio.' },
  { action_key: 'cta_faca_simulacao', title: 'Faça uma Simulação (Banners Principais)', default_message: '🚜 Olá! Vi as opções de financiamento no site da Plantae e quero simular as taxas e prazos para a minha produção.' },
  { action_key: 'cta_quero_ser_cliente', title: 'Quero ser um Cliente Plantae', default_message: '🌱 Olá! Tenho interesse em me tornar cliente da Plantae Agrocrédito e ter acesso a crédito ágil para o campo.' },
  { action_key: 'cta_quero_ser_parceiro', title: 'Quero ser um Parceiro Plantae', default_message: '🤝 Olá! Sou consultor/correspondente do agro e gostaria de saber como me tornar um parceiro oficial da Plantae.' },
  { action_key: 'cta_falar_gerente', title: 'Falar com um Gerente de Contas', default_message: '👨‍💼 Olá! Gostaria de conversar com um gerente de contas da Plantae Agrocrédito para atendimento exclusivo.' },
  { action_key: 'cta_credito_rural', title: 'Crédito Rural (Culturas e Lavouras)', default_message: '🌾 Olá! Gostaria de consultoria sobre *Crédito Rural* para minha lavoura/safra.' },
  { action_key: 'cta_consignagro', title: 'ConsignAgro (Crédito Consignado)', default_message: '💼 Olá! Gostaria de informações sobre as condições especiais do *ConsignAgro* da Plantae.' },
  { action_key: 'cta_seguros', title: 'Seguros Agrícolas', default_message: '🛡️ Olá! Gostaria de fazer uma cotação de *Seguro Agrícola / Safra* com a equipe Plantae.' },
  { action_key: 'cta_whatsapp_flutuante', title: 'WhatsApp Flutuante (Acesso Rápido)', default_message: '🌾 Olá! Estou no site da Plantae Agrocrédito e gostaria de tirar algumas dúvidas pelo WhatsApp.' },
  { action_key: 'cta_atendimento_geral', title: 'Atendimento Geral / Rodapé', default_message: '💬 Olá! Gostaria de atendimento comercial da equipe Plantae Agrocrédito.' },
  { action_key: 'cta_na_midia', title: 'Plantae na Mídia / Ler Matérias', default_message: '📰 Olá! Vi as matérias e reportagens sobre a Plantae Agrocrédito e gostaria de entender melhor as soluções para o agronegócio.' },
  { action_key: 'cta_quem_somos', title: 'Institucional - Quem Somos', default_message: '🌱 Olá! Estive no site da Plantae Agrocrédito e gostaria de conhecer mais sobre a atuação da empresa no agronegócio.' },
  { action_key: 'cta_orientacao_financeira', title: 'Orientação Financeira', default_message: '🌾 Olá! Gostaria de receber orientação financeira personalizada para planejamento da minha safra.' },
  { action_key: 'cta_correspondentes', title: 'Correspondentes Autorizados', default_message: '🤝 Olá! Gostaria de falar com o time de correspondentes da Plantae Agrocrédito.' },
  { action_key: 'cta_governanca', title: 'Governança Corporativa', default_message: '📄 Olá! Gostaria de informações sobre governança corporativa da Plantae Agrocrédito.' },
  { action_key: 'cta_documentos', title: 'Documentos e Publicações', default_message: '📋 Olá! Gostaria de solicitar documentos e publicações oficiais da Plantae Agrocrédito.' }
];

function getMessagesFilePath() {
  return path.join(process.cwd(), 'data', 'messages.json');
}

function loadMessages() {
  try {
    const filePath = getMessagesFilePath();
    if (fs.existsSync(filePath)) {
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (Array.isArray(raw) && raw.length > 0) return raw;
    }
  } catch (e) {}

  // Return defaults with current_message = default_message
  return DEFAULT_MESSAGES.map(m => ({
    ...m,
    current_message: m.default_message,
    updated_at: null
  }));
}

function saveMessages(messages) {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(getMessagesFilePath(), JSON.stringify(messages, null, 2), 'utf8');
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

  if (req.method === 'GET') {
    const messages = loadMessages();
    return res.status(200).json({ success: true, messages });
  }

  // POST: update a specific message (body: { action_key, message })
  if (req.method === 'POST') {
    let body = req.body || {};
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) {}
    }

    const { action_key, message, reset } = body;
    if (!action_key) {
      return res.status(400).json({ error: 'action_key is required' });
    }

    const messages = loadMessages();
    const idx = messages.findIndex(m => m.action_key === action_key);

    if (idx === -1) {
      // Add new
      const def = DEFAULT_MESSAGES.find(m => m.action_key === action_key);
      messages.push({
        action_key,
        title: (def && def.title) || action_key,
        default_message: (def && def.default_message) || message || '',
        current_message: reset ? ((def && def.default_message) || '') : (message || ''),
        updated_at: new Date().toISOString()
      });
    } else {
      if (reset) {
        messages[idx].current_message = messages[idx].default_message;
      } else if (message !== undefined) {
        messages[idx].current_message = message;
      }
      messages[idx].updated_at = new Date().toISOString();
    }

    saveMessages(messages);
    return res.status(200).json({ success: true, message: 'Updated successfully' });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};
