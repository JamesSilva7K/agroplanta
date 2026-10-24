/**
 * Plantae Agrocrédito - Vercel Serverless Function for General Event Tracking
 * Handles POST /api/track/event
 */

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    let data = req.body || {};
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch (e) {}
    }
    return res.status(200).json({
      success: true,
      event: data.type || data.event || 'unknown',
      recorded: true
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};
