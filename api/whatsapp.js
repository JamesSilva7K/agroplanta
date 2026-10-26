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

module.exports = function handler(req, res) {
  const query = req.query || {};
  const actionKey = query.action || 'cta_atendimento_geral';
  const phone = getActivePhone();

  let message = query.msg || CONTEXT_MESSAGES[actionKey] || CONTEXT_MESSAGES.cta_atendimento_geral;

  const encodedMsg = encodeURIComponent(message);
  const targetUrl = `https://wa.me/${phone}?text=${encodedMsg}`;

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
