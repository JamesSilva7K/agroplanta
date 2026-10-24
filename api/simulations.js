/**
 * Plantae Agrocrédito - Vercel Serverless Function for Simulations List
 * Handles GET /api/simulations
 * Returns simulation history. In Vercel, simulations are tracked via Telegram bot
 * and are not stored in a persistent SQLite DB. Returns empty array gracefully.
 */

const fs = require('fs');
const path = require('path');

function getSimulationsFilePath() {
  return path.join(process.cwd(), 'data', 'simulations.json');
}

function loadSimulations(limit = 50) {
  try {
    const filePath = getSimulationsFilePath();
    if (fs.existsSync(filePath)) {
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (Array.isArray(raw)) {
        return raw.slice(-limit).reverse();
      }
    }
  } catch (e) {}
  return [];
}

function saveSimulation(sim) {
  try {
    const existing = loadSimulations(200).reverse();
    existing.push({ ...sim, id: Date.now(), created_at: new Date().toISOString() });
    // Keep last 200
    const trimmed = existing.slice(-200);
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(getSimulationsFilePath(), JSON.stringify(trimmed, null, 2), 'utf8');
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
    const limit = parseInt((req.query && req.query.limit) || '50', 10);
    const simulations = loadSimulations(limit);
    return res.status(200).json({
      success: true,
      simulations,
      total: simulations.length
    });
  }

  if (req.method === 'POST') {
    let body = req.body || {};
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) {}
    }
    saveSimulation(body);
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};
