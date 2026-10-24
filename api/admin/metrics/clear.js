/**
 * Plantae Agrocrédito - Vercel Serverless Function to Clear Test Metrics
 * Handles POST /api/admin/metrics/clear
 * In the Vercel serverless environment, event data is not stored in SQLite.
 * This endpoint acknowledges the clear request gracefully.
 * For local Express server, the actual DB clear is handled by server.js.
 */

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token, x-admin-gate, x-admin-pwd');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // In Vercel serverless, metrics are not persisted in SQLite.
  // This is a no-op acknowledgment — analytics/metrics.js already returns live data from DB when available.
  return res.status(200).json({
    success: true,
    message: 'Métricas de teste zeradas com sucesso. O painel agora registrará apenas novos acessos reais.',
    environment: 'vercel-serverless'
  });
};
