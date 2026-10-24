/**
 * Plantae Agrocrédito - Vercel Serverless Function for Analytics Metrics
 * Handles GET /api/analytics/metrics?hours=24
 * Reads from data/simulations.json and data/events.json if available,
 * otherwise returns aggregated demo metrics for the dashboard.
 */

const fs = require('fs');
const path = require('path');

function readJsonFile(filePath, fallback = []) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (e) {}
  return fallback;
}

function buildMetrics(hours = 24) {
  const since = new Date(Date.now() - hours * 3600 * 1000);

  const simulationsPath = path.join(process.cwd(), 'data', 'simulations.json');
  const eventsPath = path.join(process.cwd(), 'data', 'events.json');

  const simulations = readJsonFile(simulationsPath, []);
  const events = readJsonFile(eventsPath, []);

  // Filter by time window
  const recentSims = simulations.filter(s => {
    if (!s.created_at) return true;
    return new Date(s.created_at) >= since;
  });

  const recentEvents = events.filter(e => {
    if (!e.created_at) return true;
    return new Date(e.created_at) >= since;
  });

  // If we have real data, calculate real metrics
  if (recentEvents.length > 0 || recentSims.length > 0) {
    const inputs = recentEvents.filter(e => e.type === 'input');
    const exits = recentEvents.filter(e => e.type === 'exit');
    const waOutputs = recentEvents.filter(e => e.type === 'output_whatsapp');

    const uniqueSessions = new Set([...inputs.map(e => e.session_id), ...recentSims.map(s => s.session_id)].filter(Boolean));
    const uniqueWaSessions = new Set(waOutputs.map(e => e.session_id).filter(Boolean));

    const totalInputs = inputs.length + recentSims.length;
    const totalWa = waOutputs.length + recentSims.length;
    const convRate = uniqueSessions.size > 0 ? ((uniqueWaSessions.size / uniqueSessions.size) * 100).toFixed(2) : '0.00';
    const avgDuration = inputs.length > 0 ? Math.round(inputs.reduce((acc, e) => acc + (e.duration_seconds || 0), 0) / inputs.length) : 0;

    // CTA Breakdown
    const ctaMap = {};
    [...recentEvents, ...recentSims].forEach(item => {
      const key = item.button_text || item.action_key || 'Geral';
      ctaMap[key] = (ctaMap[key] || 0) + 1;
    });

    const ctaBreakdown = Object.entries(ctaMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([btn, count]) => ({
        button_text: btn,
        count,
        percentage: totalInputs > 0 ? parseFloat(((count / totalInputs) * 100).toFixed(1)) : 0
      }));

    // Device stats
    const deviceMap = {};
    recentEvents.forEach(e => {
      const dev = e.device || 'Desktop';
      if (!deviceMap[dev]) deviceMap[dev] = { inputs: 0, outputs: 0 };
      if (e.type === 'input') deviceMap[dev].inputs++;
      if (e.type === 'output_whatsapp') deviceMap[dev].outputs++;
    });

    const deviceStats = {};
    Object.entries(deviceMap).forEach(([dev, data]) => {
      const pct = totalInputs > 0 ? parseFloat(((data.inputs / totalInputs) * 100).toFixed(1)) : 0;
      deviceStats[dev] = {
        inputs: data.inputs,
        outputs: data.outputs,
        input_percentage: pct,
        conversion_rate: data.inputs > 0 ? parseFloat(((data.outputs / data.inputs) * 100).toFixed(2)) : '0.00'
      };
    });

    // Sources
    const sourceMap = {};
    recentEvents.forEach(e => {
      const src = e.utm_source || 'Direto';
      sourceMap[src] = (sourceMap[src] || 0) + 1;
    });
    const sources = Object.entries(sourceMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([source, count]) => ({
        source,
        count,
        percentage: parseFloat(((count / (recentEvents.length || 1)) * 100).toFixed(1))
      }));

    return {
      summary: {
        total_inputs: totalInputs,
        unique_inputs: uniqueSessions.size,
        total_exits: exits.length,
        avg_duration_seconds: avgDuration,
        bounce_rate_percentage: exits.length > 0 && uniqueSessions.size > 0 ? ((exits.length / uniqueSessions.size) * 100).toFixed(1) : '0.0',
        total_whatsapp_outputs: totalWa,
        unique_whatsapp_outputs: uniqueWaSessions.size,
        whatsapp_conversion_rate: convRate,
        global_conversion_rate: convRate
      },
      cta_breakdown: ctaBreakdown,
      device_stats: deviceStats,
      sources,
      leads: waOutputs.slice(-20).reverse().map(l => ({
        ...l,
        quality_label: 'Validado'
      })),
      simulations: recentSims.slice(0, 10)
    };
  }

  // Fallback: return empty/zero metrics (no mock data)
  return {
    summary: {
      total_inputs: 0,
      unique_inputs: 0,
      total_exits: 0,
      avg_duration_seconds: 0,
      bounce_rate_percentage: '0.0',
      total_whatsapp_outputs: 0,
      unique_whatsapp_outputs: 0,
      whatsapp_conversion_rate: '0.00',
      global_conversion_rate: '0.00'
    },
    cta_breakdown: [],
    device_stats: {},
    sources: [],
    leads: [],
    simulations: []
  };
}

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const hours = parseInt((req.query && req.query.hours) || '24', 10);
  const metrics = buildMetrics(hours);
  return res.status(200).json(metrics);
};
