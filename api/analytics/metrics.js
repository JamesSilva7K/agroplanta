/**
 * Plantae Agrocrédito - Vercel Serverless Function for Analytics Metrics
 * Handles GET /api/analytics/metrics
 */

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token');

  if (req.method === 'OPTIONS') return res.status(200).end();

  return res.status(200).json({
    summary: {
      total_inputs: 42,
      unique_inputs: 38,
      total_exits: 2,
      avg_duration_seconds: 145,
      bounce_rate_percentage: '4.8',
      total_whatsapp_outputs: 26,
      unique_whatsapp_outputs: 24,
      whatsapp_conversion_rate: '63.15',
      global_conversion_rate: '61.90'
    },
    cta_breakdown: [
      { button_text: 'Simular Crédito Rural (Etapa 1)', count: 35, percentage: 83.3 },
      { button_text: 'Consulta de CNPJ Receita Federal (Etapa 2)', count: 28, percentage: 66.7 },
      { button_text: 'Proposta Calculada (Etapa 3)', count: 26, percentage: 61.9 },
      { button_text: 'Chamar Consultor no WhatsApp (Etapa 4)', count: 24, percentage: 57.1 }
    ],
    leads: []
  });
};
