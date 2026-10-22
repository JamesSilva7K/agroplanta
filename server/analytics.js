/**
 * Plantae Agrocrédito - Real-Time Analytics & Percentage Metrics Engine
 */
const { db } = require('./db');

function getMetrics(timeRangeHours = 24) {
  const sinceClause = `created_at >= datetime('now', '-${parseInt(timeRangeHours, 10)} hours')`;

  // 1. INPUTS (User Entries)
  const totalInputsRow = db.prepare(`SELECT COUNT(*) as count FROM events WHERE type = 'input' AND ${sinceClause}`).get();
  const totalInputs = totalInputsRow ? totalInputsRow.count : 0;

  const uniqueInputsRow = db.prepare(`SELECT COUNT(DISTINCT session_id) as count FROM events WHERE type = 'input' AND ${sinceClause}`).get();
  const uniqueInputs = uniqueInputsRow ? uniqueInputsRow.count : 0;

  // 2. EXITS (User Departures)
  const totalExitsRow = db.prepare(`SELECT COUNT(*) as count FROM events WHERE type = 'exit' AND ${sinceClause}`).get();
  const totalExits = totalExitsRow ? totalExitsRow.count : 0;

  // Average session duration
  const avgDurationRow = db.prepare(`SELECT AVG(duration_seconds) as avg_d FROM events WHERE duration_seconds > 0 AND ${sinceClause}`).get();
  const avgDuration = avgDurationRow && avgDurationRow.avg_d ? Math.round(avgDurationRow.avg_d) : 0;

  // 3. OUTPUTS - WHATSAPP
  const totalWhatsappRow = db.prepare(`SELECT COUNT(*) as count FROM events WHERE type = 'output_whatsapp' AND ${sinceClause}`).get();
  const totalWhatsapp = totalWhatsappRow ? totalWhatsappRow.count : 0;

  const uniqueWhatsappRow = db.prepare(`SELECT COUNT(DISTINCT session_id) as count FROM events WHERE type = 'output_whatsapp' AND ${sinceClause}`).get();
  const uniqueWhatsapp = uniqueWhatsappRow ? uniqueWhatsappRow.count : 0;

  // 4. OUTPUTS - SOCIAL MEDIA
  const totalSocialRow = db.prepare(`SELECT COUNT(*) as count FROM events WHERE type = 'output_social' AND ${sinceClause}`).get();
  const totalSocial = totalSocialRow ? totalSocialRow.count : 0;

  // 5. TOTAL OUTPUTS
  const totalOutputs = totalWhatsapp + totalSocial;

  // 6. PERCENTAGES & CONVERSION RATES
  const whatsappConversionRate = uniqueInputs > 0 
    ? ((uniqueWhatsapp / uniqueInputs) * 100).toFixed(2) 
    : '0.00';

  const globalConversionRate = uniqueInputs > 0 
    ? ((totalOutputs / uniqueInputs) * 100).toFixed(2) 
    : '0.00';

  // Bounce rate estimation
  const bouncesRow = db.prepare(`
    SELECT COUNT(*) as count FROM (
      SELECT session_id, COUNT(CASE WHEN type = 'output_whatsapp' OR type = 'output_social' THEN 1 END) as out_count,
             MAX(duration_seconds) as max_dur
      FROM events
      WHERE ${sinceClause}
      GROUP BY session_id
      HAVING out_count = 0 AND (max_dur IS NULL OR max_dur < 15)
    )
  `).get();
  const bounces = bouncesRow ? bouncesRow.count : 0;
  const bounceRate = uniqueInputs > 0 ? ((bounces / uniqueInputs) * 100).toFixed(1) : '0.0';

  // 7. WHATSAPP CONVERSIONS BY CTA / BUTTON
  const ctaRows = db.prepare(`
    SELECT action_key, button_text, COUNT(*) as count
    FROM events
    WHERE type = 'output_whatsapp' AND ${sinceClause}
    GROUP BY action_key, button_text
    ORDER BY count DESC
  `).all();

  const ctaBreakdown = ctaRows.map(row => ({
    action_key: row.action_key,
    button_text: row.button_text || row.action_key,
    count: row.count,
    percentage: totalWhatsapp > 0 ? ((row.count / totalWhatsapp) * 100).toFixed(1) : '0.0'
  }));

  // 8. SOCIAL MEDIA BREAKDOWN
  const socialRows = db.prepare(`
    SELECT action_key, button_text, COUNT(*) as count
    FROM events
    WHERE type = 'output_social' AND ${sinceClause}
    GROUP BY action_key
    ORDER BY count DESC
  `).all();

  const socialBreakdown = socialRows.map(row => ({
    platform: row.action_key,
    name: row.button_text || row.action_key,
    count: row.count,
    percentage: totalSocial > 0 ? ((row.count / totalSocial) * 100).toFixed(1) : '0.0'
  }));

  // 9. DEVICE BREAKDOWN (Inputs & WhatsApp)
  const deviceInputsRows = db.prepare(`
    SELECT COALESCE(device, 'Desktop') as device, COUNT(*) as count
    FROM events
    WHERE type = 'input' AND ${sinceClause}
    GROUP BY device
  `).all();

  const deviceWhatsappRows = db.prepare(`
    SELECT COALESCE(device, 'Desktop') as device, COUNT(*) as count
    FROM events
    WHERE type = 'output_whatsapp' AND ${sinceClause}
    GROUP BY device
  `).all();

  const deviceStats = {};
  ['Mobile', 'Desktop', 'Tablet'].forEach(dev => {
    const inCount = (deviceInputsRows.find(r => r.device.toLowerCase() === dev.toLowerCase()) || {}).count || 0;
    const waCount = (deviceWhatsappRows.find(r => r.device.toLowerCase() === dev.toLowerCase()) || {}).count || 0;
    const inPct = totalInputs > 0 ? ((inCount / totalInputs) * 100).toFixed(1) : '0.0';
    const convRate = inCount > 0 ? ((waCount / inCount) * 100).toFixed(2) : '0.00';
    deviceStats[dev] = {
      inputs: inCount,
      input_percentage: inPct,
      whatsapp: waCount,
      conversion_rate: convRate
    };
  });

  // 10. TRAFFIC SOURCES & UTMS
  const sourceRows = db.prepare(`
    SELECT 
      CASE 
        WHEN utm_source != '' THEN utm_source
        WHEN referrer LIKE '%google%' THEN 'Google Orgânico'
        WHEN referrer LIKE '%facebook%' OR referrer LIKE '%instagram%' THEN 'Meta / Redes'
        WHEN referrer LIKE '%linkedin%' THEN 'LinkedIn'
        WHEN referrer != '' THEN 'Referral Externo'
        ELSE 'Acesso Direto'
      END as source,
      COUNT(*) as count
    FROM events
    WHERE type = 'input' AND ${sinceClause}
    GROUP BY source
    ORDER BY count DESC
    LIMIT 10
  `).all();

  const sourceBreakdown = sourceRows.map(r => ({
    source: r.source,
    count: r.count,
    percentage: totalInputs > 0 ? ((r.count / totalInputs) * 100).toFixed(1) : '0.0'
  }));

  // 11. DETAILED & VALIDATED LEADS
  const detailedLeads = db.prepare(`
    SELECT id, session_id, action_key, button_text, device, browser, os, ip,
           utm_source, utm_medium, utm_campaign, referrer, whatsapp_message,
           duration_seconds, created_at
    FROM events
    WHERE type = 'output_whatsapp'
    ORDER BY id DESC
    LIMIT 50
  `).all().map(lead => {
    // Validate lead score based on completeness
    let score = 70;
    if (lead.utm_source) score += 10;
    if (lead.duration_seconds > 20) score += 10;
    if (lead.action_key.includes('simular') || lead.action_key.includes('gerente')) score += 10;

    let leadQuality = 'Validado (Qualidade Alta)';
    if (score >= 90) leadQuality = '🔥 Lead Premium (Alta Intenção)';
    else if (score >= 75) leadQuality = '🟢 Lead Validado';
    else leadQuality = '🟡 Lead Prospect';

    return {
      ...lead,
      quality_score: Math.min(score, 100),
      quality_label: leadQuality
    };
  });

  return {
    timeframe_hours: timeRangeHours,
    summary: {
      total_inputs: totalInputs,
      unique_inputs: uniqueInputs,
      total_exits: totalExits,
      avg_duration_seconds: avgDuration,
      bounce_rate_percentage: bounceRate,
      total_whatsapp_outputs: totalWhatsapp,
      unique_whatsapp_outputs: uniqueWhatsapp,
      total_social_outputs: totalSocial,
      total_outputs: totalOutputs,
      whatsapp_conversion_rate: whatsappConversionRate,
      global_conversion_rate: globalConversionRate
    },
    cta_breakdown: ctaBreakdown,
    social_breakdown: socialBreakdown,
    device_stats: deviceStats,
    sources: sourceBreakdown,
    leads: detailedLeads
  };
}

module.exports = {
  getMetrics
};
