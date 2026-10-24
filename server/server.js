/**
 * Plantae Agrocrédito - Main Server
 * Express Server with Real-Time Tracking, Dynamic WhatsApp Routing,
 * Analytics API, Supreme Admin HTML Dashboard, and Telegram Bot Integration.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('node:path');
const fs = require('node:fs');
const { 
  insertEvent, 
  getConfig, 
  setConfig, 
  getAllConfigs,
  getContextMessages, 
  getContextMessage, 
  updateContextMessage, 
  resetContextMessage,
  saveSimulation,
  getRecentSimulations,
  recordLeadStep,
  insertLog
} = require('./db');
const { getMetrics } = require('./analytics');
const { telegramBot } = require('./bot/telegram_bot');
const { requireAdminAuth, generate7DigitToken, validateAdminToken } = require('./security');
const { consultCnpjWithAutoFallback, testAllTokens, isValidCNPJ, formatCNPJ } = require('./cnpj_service');
const { db } = require('./db');

function getDefaultWhatsApp() {
  return getConfig('whatsapp_number') || process.env.DEFAULT_WHATSAPP_NUMBER || '5518981115624';
}

function syncStaticConfigFile(updatedProps = {}) {
  try {
    const allConfigs = getAllConfigs ? getAllConfigs() : {};
    const configData = {
      whatsapp_number: updatedProps.whatsapp_number || allConfigs.whatsapp_number || process.env.DEFAULT_WHATSAPP_NUMBER || '5518981115624',
      redirects_active: allConfigs.redirects_active !== '0',
      bot_alerts_enabled: allConfigs.bot_alerts_enabled !== '0',
      primary_color: allConfigs.primary_color || '#00A870',
      secondary_color: allConfigs.secondary_color || '#013644',
      accent_color: allConfigs.accent_color || '#006B59',
      banner_slide_1: allConfigs.banner_slide_1 || 'images/hero-1.png',
      banner_slide_2: allConfigs.banner_slide_2 || 'images/hero-2.png',
      banner_slide_3: allConfigs.banner_slide_3 || 'images/hero-3.png',
      banner_slide_4: allConfigs.banner_slide_4 || 'images/banner-davi.jpg',
      banner_mobile: allConfigs.banner_mobile || 'images/plantae-hero-1-mb.png',
      updated_at: new Date().toISOString(),
      ...updatedProps
    };

    const rootDir = path.join(__dirname, '..');
    const apiDir = path.join(rootDir, 'api');
    if (!fs.existsSync(apiDir)) fs.mkdirSync(apiDir, { recursive: true });
    fs.writeFileSync(path.join(apiDir, 'config.json'), JSON.stringify(configData, null, 2), 'utf8');

    const dataDir = path.join(rootDir, 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(path.join(dataDir, 'config.json'), JSON.stringify(configData, null, 2), 'utf8');
  } catch (err) {
    console.warn('[Sync] Could not sync static config file:', err.message);
  }
}

// Initial sync on module load
syncStaticConfigFile();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
// Increased body limit to support base64 image uploads from admin panel
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// High-performance static assets with caching headers for zero lag
const staticOptions = { maxAge: '1d', etag: true };
app.use('/css', express.static(path.join(__dirname, '..', 'css'), staticOptions));
app.use('/js', express.static(path.join(__dirname, '..', 'js'), staticOptions));
app.use('/images', express.static(path.join(__dirname, '..', 'images'), staticOptions));
app.use('/fonts', express.static(path.join(__dirname, '..', 'fonts'), { maxAge: '7d', etag: true }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), staticOptions));

// Serve admin stylesheet publicly with aggressive cache for ultra-fast render
app.get(['/admin.css', '/admin/admin.css'], (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.sendFile(path.join(__dirname, '..', 'admin', 'admin.css'));
});


// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Helper to determine device type from User Agent
function detectDevice(userAgent = '') {
  const ua = userAgent.toLowerCase();
  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
    return 'Mobile';
  }
  if (/ipad|tablet/i.test(ua)) {
    return 'Tablet';
  }
  return 'Desktop';
}

function detectBrowser(userAgent = '') {
  const ua = userAgent.toLowerCase();
  if (ua.includes('chrome') && !ua.includes('edg')) return 'Chrome';
  if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';
  if (ua.includes('firefox')) return 'Firefox';
  if (ua.includes('edg')) return 'Edge';
  if (ua.includes('opera') || ua.includes('opr')) return 'Opera';
  return 'Outro';
}

// 1. EVENT INGESTION ENDPOINT (Inputs, Exits and Outputs)
app.post('/api/track/event', (req, res) => {
  try {
    const body = req.body || {};
    const userAgent = req.headers['user-agent'] || '';
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const device = body.device || detectDevice(userAgent);
    const browser = body.browser || detectBrowser(userAgent);

    const eventData = {
      type: body.type || 'input',
      session_id: body.session_id || 'sess_' + Math.random().toString(36).substring(2, 9),
      action_key: body.action_key || '',
      button_text: body.button_text || '',
      referrer: body.referrer || '',
      utm_source: body.utm_source || '',
      utm_medium: body.utm_medium || '',
      utm_campaign: body.utm_campaign || '',
      device: device,
      browser: browser,
      os: body.os || '',
      ip: ip,
      whatsapp_message: body.whatsapp_message || '',
      duration_seconds: body.duration_seconds || 0
    };

    insertEvent(eventData);

    // If it's a WhatsApp conversion, fire instant Telegram lead notification
    if (eventData.type === 'output_whatsapp') {
      const waNumber = getDefaultWhatsApp();
      telegramBot.notifyLead({
        ...eventData,
        whatsapp_number: waNumber
      }).catch(err => console.error('Telegram notification error:', err.message));
    }

    return res.json({ success: true, event_id: Date.now() });
  } catch (err) {
    console.error('Error tracking event:', err);
    return res.status(500).json({ error: 'Failed to record event' });
  }
});

// 1.1 ADVANCED LEAD FUNNEL STEP TRACKING ENDPOINT
app.post('/api/track/lead-step', (req, res) => {
  try {
    const body = req.body || {};
    const userAgent = req.headers['user-agent'] || '';
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const device = body.device || detectDevice(userAgent);
    const browser = body.browser || detectBrowser(userAgent);

    const stepData = {
      session_id: body.session_id || 'sess_' + Math.random().toString(36).substring(2, 9),
      step_number: parseInt(body.step_number || body.step || 1, 10),
      step_name: body.step_name || `Etapa ${body.step_number || body.step}`,
      lead_name: body.name || body.lead_name || '',
      phone: body.phone || '',
      email: body.email || '',
      document: body.document || body.cnpj || body.cpf || '',
      company_name: body.company_name || body.razao_social || '',
      credit_value: body.credit_value ? String(body.credit_value) : '',
      installments: parseInt(body.installments, 10) || 0,
      frequency: body.frequency || '',
      estimated_installment: body.estimated_installment ? String(body.estimated_installment) : '',
      total_amount: body.total_amount ? String(body.total_amount) : '',
      location: body.location || '',
      crop: body.crop || '',
      utm_source: body.utm_source || '',
      utm_medium: body.utm_medium || '',
      utm_campaign: body.utm_campaign || '',
      device: device,
      browser: browser,
      ip: ip,
      metadata: body.metadata || null
    };

    // Save in DB
    recordLeadStep(stepData);

    // Notify Telegram Admin in real time!
    telegramBot.notifyLeadStep(stepData).catch(err => {
      console.error('Error sending lead step notification:', err.message);
    });

    return res.json({ success: true, step: stepData.step_number });
  } catch (err) {
    console.error('Error tracking lead step:', err);
    return res.status(500).json({ error: 'Failed to record lead step' });
  }
});

// 2. DYNAMIC WHATSAPP ROUTING ENDPOINT
app.get('/r/whatsapp', (req, res) => {
  try {
    const actionKey = req.query.action || 'cta_atendimento_geral';
    const buttonText = req.query.btn || '';
    const utmSource = req.query.utm_source || '';
    const utmMedium = req.query.utm_medium || '';
    const utmCampaign = req.query.utm_campaign || '';
    const sessionId = req.query.sid || '';
    const userAgent = req.headers['user-agent'] || '';
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const device = detectDevice(userAgent);

    // Check if redirects are active
    const redirectsActive = getConfig('redirects_active') !== '0';
    const waNumber = getDefaultWhatsApp();

    // Retrieve active context-aware message
    const msgRecord = getContextMessage(actionKey) || getContextMessage('cta_atendimento_geral');
    const message = msgRecord ? msgRecord.current_message : 'Olá! Gostaria de atendimento da Plantae Agrocrédito.';

    // Record output event
    insertEvent({
      type: 'output_whatsapp',
      session_id: sessionId,
      action_key: actionKey,
      button_text: buttonText,
      referrer: req.headers['referer'] || '',
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      device: device,
      browser: detectBrowser(userAgent),
      ip: ip,
      whatsapp_message: message,
      duration_seconds: 0
    });

    // Notify Telegram Admin
    telegramBot.notifyLead({
      action_key: actionKey,
      button_text: buttonText,
      whatsapp_number: waNumber,
      whatsapp_message: message,
      utm_source: utmSource,
      device: device,
      browser: detectBrowser(userAgent)
    }).catch(e => console.error(e));

    const encodedMsg = encodeURIComponent(message);
    const targetUrl = `https://wa.me/${waNumber}?text=${encodedMsg}`;

    // If client requested JSON (e.g. AJAX router from frontend)
    if (req.headers['accept'] && req.headers['accept'].includes('application/json')) {
      return res.json({
        success: true,
        redirect_url: targetUrl,
        phone: waNumber,
        message: message,
        active: redirectsActive
      });
    }

    // Direct HTTP redirect
    return res.redirect(302, targetUrl);
  } catch (err) {
    console.error('Error handling redirect:', err);
    return res.redirect(302, 'https://wa.me/' + getDefaultWhatsApp());
  }
});

// 2.1 SIMULATION SUBMISSION & WHATSAPP ROUTING ENDPOINT
app.post('/api/simulate', (req, res) => {
  try {
    const body = req.body || {};
    const userAgent = req.headers['user-agent'] || '';
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const device = body.device || detectDevice(userAgent);
    const browser = body.browser || detectBrowser(userAgent);

    const creditValue = String(body.credit_value ?? '').trim();
    const installments = parseInt(body.installments, 10) || 0;
    const frequency = String(body.frequency ?? '').trim();
    const estimatedInstallment = String(body.estimated_installment ?? '').trim();
    const sessionId = body.session_id || 'sess_' + Math.random().toString(36).substring(2, 9);
    const name = String(body.name ?? '').trim();
    const phone = String(body.phone ?? '').trim();
    const email = String(body.email ?? '').trim();
    const occupation = String(body.occupation ?? '').trim();
    const totalAmount = String(body.total_amount ?? '').trim();

    if (!creditValue || installments <= 0 || !frequency || frequency === 'Selecione') {
      return res.status(400).json({ error: 'Preencha todos os campos da simulação corretamente.' });
    }

    // Contextual message for WhatsApp pre-fill
    let waText = '';
    if (name) {
      waText = `🌾 Olá! Sou *${name}*${occupation ? ` (${occupation})` : ''}.\nRealizei uma simulação de Crédito Rural no site da Plantae:\n\n` +
        `💰 *Valor Solicitado:* ${creditValue}\n` +
        `🔢 *Prazo:* ${installments}x (${frequency})\n` +
        `💵 *Parcela Estimada:* ${estimatedInstallment}\n` +
        (totalAmount ? `📊 *Total Estimado:* ${totalAmount}\n\n` : '\n') +
        `Gostaria de dar continuidade à análise da proposta e falar com um consultor!`;
    } else {
      waText = `🌾 Olá! Realizei uma simulação de Crédito Rural no site da Plantae:\n\n` +
        `💰 *Valor Solicitado:* ${creditValue}\n` +
        `🔢 *Quantidade de Parcelas:* ${installments}x\n` +
        `⏱️ *Frequência de Pagamento:* ${frequency}\n` +
        `💵 *Estimativa da Parcela:* ${estimatedInstallment}\n\n` +
        `Gostaria de falar com um especialista da Plantae Agrocrédito para validar as taxas e condições do meu perfil!`;
    }

    const waNumber = getConfig('whatsapp_number') || getDefaultWhatsApp();

    const simData = {
      session_id: sessionId,
      credit_value: creditValue,
      installments: installments,
      frequency: frequency,
      estimated_installment: estimatedInstallment,
      whatsapp_number: waNumber,
      whatsapp_message: waText,
      utm_source: body.utm_source || '',
      utm_medium: body.utm_medium || '',
      utm_campaign: body.utm_campaign || '',
      device: device,
      browser: browser,
      ip: ip,
      name: name,
      phone: phone,
      email: email,
      occupation: occupation,
      total_amount: totalAmount
    };

    // Save simulation in database
    saveSimulation(simData);

    // Also record event for analytics
    insertEvent({
      type: 'output_whatsapp',
      session_id: sessionId,
      action_key: 'simulacao_credito',
      button_text: `Simulação: ${creditValue} / ${installments}x (${frequency})`,
      referrer: body.referrer || '',
      utm_source: body.utm_source || '',
      utm_medium: body.utm_medium || '',
      utm_campaign: body.utm_campaign || '',
      device: device,
      browser: browser,
      os: body.os || '',
      ip: ip,
      whatsapp_message: waText,
      duration_seconds: body.duration_seconds || 0
    });

    // Notify Telegram Admin immediately with complete simulation data!
    telegramBot.notifySimulation(simData).catch(err => console.error('Telegram simulation alert error:', err.message));

    const encodedMsg = encodeURIComponent(waText);
    const redirectUrl = `https://wa.me/${waNumber}?text=${encodedMsg}`;

    return res.json({
      success: true,
      redirect_url: redirectUrl,
      whatsapp_number: waNumber,
      message: waText,
      data: simData
    });
  } catch (err) {
    console.error('Error handling simulation:', err);
    return res.status(500).json({ error: 'Erro ao processar simulação' });
  }
});

// CNPJ Consultation API (Multi-Token Failover & Telegram Alerts)
app.all('/api/cnpj', async (req, res) => {
  try {
    const cnpjRaw = req.method === 'GET' ? req.query.cnpj : (req.body && req.body.cnpj);
    const leadInfo = req.method === 'POST' ? req.body : {};
    if (!cnpjRaw) {
      return res.status(400).json({ success: false, message: 'CNPJ é obrigatório.' });
    }

    const result = await consultCnpjWithAutoFallback(cnpjRaw, leadInfo, telegramBot);

    // Notify lead progress in Etapa 2 if valid CNPJ found
    if (result && result.success && result.result) {
      const cd = result.result;
      const userAgent = req.headers['user-agent'] || '';
      telegramBot.notifyLeadStep({
        session_id: leadInfo.session_id || 'sess_' + Date.now(),
        step_number: 2,
        step_name: 'Consulta de CNPJ na Receita Federal',
        lead_name: leadInfo.name || '',
        phone: leadInfo.phone || '',
        email: leadInfo.email || '',
        document: formatCNPJ(cnpjRaw),
        company_name: cd.razao_social || cd.nome_fantasia || '',
        location: cd.municipio ? `${cd.municipio}${cd.uf ? ' - ' + cd.uf : ''}` : '',
        crop: cd.atividade_principal || '',
        device: detectDevice(userAgent),
        browser: detectBrowser(userAgent),
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '',
        metadata: {
          situacao: cd.situacao,
          capital_social: cd.capital_social,
          data_abertura: cd.data_abertura,
          porte: cd.porte
        }
      }).catch(() => {});
    } else if (result && !result.success && result.error_code !== 'INVALID_MATH') {
      telegramBot.notifySystemLog({
        level: 'WARN',
        category: 'CNPJ',
        message: `Falha na consulta do CNPJ ${cnpjRaw}: ${result.message || 'CNPJ não localizado'}`,
        path: '/api/cnpj',
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || ''
      }).catch(() => {});
    }

    return res.json(result);
  } catch (err) {
    console.error('Error in /api/cnpj:', err);
    telegramBot.notifySystemLog({
      level: 'ERROR',
      category: 'CNPJ',
      message: `Erro interno ao consultar CNPJ: ${err.message}`,
      details: err.stack,
      path: '/api/cnpj',
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || ''
    }).catch(() => {});
    return res.status(500).json({ success: false, message: 'Erro interno ao consultar CNPJ' });
  }
});

// Admin endpoint to test all CNPJ tokens without consuming credits
app.get('/api/cnpj/test', requireAdminAuth, async (req, res) => {
  try {
    const results = await testAllTokens();
    return res.json({ success: true, tokens: results });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Admin API to fetch recent simulations
app.get('/api/simulations', requireAdminAuth, (req, res) => {
  const sims = getRecentSimulations(50);
  return res.json({ success: true, simulations: sims });
});

// 3. CONTEXT MESSAGES API (PROTECTED)
app.get('/api/messages', requireAdminAuth, (req, res) => {
  const msgs = getContextMessages();
  return res.json({ success: true, messages: msgs });
});

app.post('/api/messages/:actionKey', requireAdminAuth, (req, res) => {
  const actionKey = req.params.actionKey;
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message content is required' });
  }
  updateContextMessage(actionKey, message);
  return res.json({ success: true, message: 'Updated successfully' });
});

app.post('/api/messages/:actionKey/reset', requireAdminAuth, (req, res) => {
  const actionKey = req.params.actionKey;
  resetContextMessage(actionKey);
  return res.json({ success: true, message: 'Reset to default successfully' });
});

// 4. CONFIG API (Public read for landing page theming, protected write)
app.get('/api/config', (req, res) => {
  const allConfigs = getAllConfigs();
  return res.json({
    whatsapp_number: allConfigs.whatsapp_number || getDefaultWhatsApp(),
    redirects_active: allConfigs.redirects_active !== '0',
    bot_alerts_enabled: allConfigs.bot_alerts_enabled !== '0',
    primary_color: allConfigs.primary_color || '#00A870',
    secondary_color: allConfigs.secondary_color || '#013644',
    accent_color: allConfigs.accent_color || '#006B59',
    banner_slide_1: allConfigs.banner_slide_1 || 'images/hero-1.png',
    banner_slide_2: allConfigs.banner_slide_2 || 'images/hero-2.png',
    banner_slide_3: allConfigs.banner_slide_3 || 'images/hero-3.png',
    banner_slide_4: allConfigs.banner_slide_4 || 'images/banner-davi.jpg',
    banner_mobile: allConfigs.banner_mobile || 'images/plantae-hero-1-mb.png'
  });
});

app.post('/api/config', requireAdminAuth, (req, res) => {
  const { whatsapp_number, redirects_active, bot_alerts_enabled } = req.body;
  if (whatsapp_number !== undefined) {
    const clean = whatsapp_number.replace(/\D/g, '');
    if (clean) setConfig('whatsapp_number', clean);
  }
  if (redirects_active !== undefined) {
    setConfig('redirects_active', redirects_active ? '1' : '0');
  }
  if (bot_alerts_enabled !== undefined) {
    setConfig('bot_alerts_enabled', bot_alerts_enabled ? '1' : '0');
  }
  syncStaticConfigFile();
  return res.json({ success: true, message: 'Configuration saved' });
});

app.post('/api/admin/config', requireAdminAuth, (req, res) => {
  const body = req.body || {};
  const allowedKeys = [
    'primary_color', 'secondary_color', 'accent_color',
    'banner_slide_1', 'banner_slide_2', 'banner_slide_3', 'banner_slide_4', 'banner_mobile'
  ];

  for (const k of allowedKeys) {
    if (body[k] !== undefined) {
      setConfig(k, body[k]);
    }
  }

  syncStaticConfigFile();
  return res.json({ success: true, message: 'Admin visual configurations updated' });
});

// 5. FILE UPLOAD ENDPOINT (PROTECTED)
app.post('/api/admin/upload', requireAdminAuth, (req, res) => {
  try {
    const { filename, data } = req.body;
    if (!data || !filename) {
      return res.status(400).json({ error: 'Data and filename required' });
    }

    // data format: data:image/png;base64,...
    const matches = data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'Invalid base64 image data' });
    }

    const buffer = Buffer.from(matches[2], 'base64');
    const safeFilename = path.basename(filename).replace(/[^a-zA-Z0-9_.-]/g, '_');
    const targetPath = path.join(uploadsDir, safeFilename);

    fs.writeFileSync(targetPath, buffer);
    return res.json({
      success: true,
      filepath: 'uploads/' + safeFilename
    });
  } catch (err) {
    console.error('Error uploading file:', err);
    return res.status(500).json({ error: 'Upload failed' });
  }
});

// 6. REAL-TIME ANALYTICS API (PROTECTED)
app.get('/api/analytics/metrics', requireAdminAuth, (req, res) => {
  const hours = parseInt(req.query.hours || '24', 10);
  const data = getMetrics(hours);
  return res.json(data);
});

// 7. CLEAR / RESET METRICS API (PROTECTED)
app.post('/api/admin/metrics/clear', requireAdminAuth, (req, res) => {
  try {
    db.prepare('DELETE FROM events').run();
    return res.json({ 
      success: true, 
      message: 'Todas as métricas de teste foram zeradas com sucesso. O banco agora registrará apenas novos acessos reais.' 
    });
  } catch (err) {
    console.error('Error clearing metrics:', err);
    return res.status(500).json({ error: 'Failed to clear metrics' });
  }
});

// 8. HEALTH CHECK
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    system: 'Plantae Agrocrédito Traffic & Redirect Engine'
  });
});

// 9. BLOCK /admin AND SUBPATHS COMPLETELY (No admin route exposed - returns 404)
app.use('/admin', (req, res, next) => {
  if (req.path === '/admin.css') {
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.sendFile(path.join(__dirname, '..', 'admin', 'admin.css'));
  }
  return res.status(404).send('<!DOCTYPE html><html><head><title>404 Not Found</title></head><body><h1>404 Not Found</h1><p>The requested URL was not found on this server.</p></body></html>');
});

// 10. SERVE 7-DIGIT ENCRYPTED SUPREME ADMIN ROUTE (/:code e.g. /7K9X2PA)
app.get('/:code', (req, res, next) => {
  const code = req.params.code;
  // If it's a 7-character alphanumeric string, verify if it is an active encrypted admin token
  if (code && code.length === 7 && /^[a-zA-Z0-9]{7}$/.test(code)) {
    const valid = validateAdminToken(code);
    if (valid) {
      res.setHeader('Set-Cookie', `plantae_admin_auth=${code.toUpperCase()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
      return res.sendFile(path.join(__dirname, '..', 'admin', 'index.html'));
    }
  }
  return next();
});

// 11. SERVE DEDICATED CONSULTATION & SIMULATION PAGES
app.use('/credito', express.static(path.join(__dirname, '..', 'credito'), staticOptions));
app.get(['/credito', '/credito/', '/credito/index.html'], (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'credito', 'index.html'));
});

app.get(['/consulta', '/consulta.html', '/simulador', '/simulador.html'], (req, res) => {
  res.redirect(301, '/credito');
});

// 12. SERVE MAIN LANDING PAGE
app.get(['/', '/index.html'], (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// 13. GLOBAL ERROR HANDLING & SYSTEM LOGGING MIDDLEWARE
app.use((err, req, res, next) => {
  console.error('💥 [Server Error Middleware]:', err);
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  
  telegramBot.notifySystemLog({
    level: 'ERROR',
    category: 'EXPRESS',
    message: err.message || 'Erro interno no servidor Express',
    details: err.stack,
    path: req.originalUrl || req.url,
    ip: ip
  }).catch(() => {});

  if (!res.headersSent) {
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Process-level uncaught exception & unhandled rejection handlers
process.on('uncaughtException', (err) => {
  console.error('🚨 [CRITICAL] Uncaught Exception:', err);
  telegramBot.notifySystemLog({
    level: 'CRITICAL',
    category: 'SYSTEM',
    message: `Exceção não tratada: ${err.message}`,
    details: err.stack
  }).catch(() => {});
});

process.on('unhandledRejection', (reason) => {
  console.error('⚠️ [WARNING] Unhandled Rejection:', reason);
  const msg = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? reason.stack : null;
  telegramBot.notifySystemLog({
    level: 'WARN',
    category: 'PROMISE',
    message: `Rejeição de promessa não capturada: ${msg}`,
    details: stack
  }).catch(() => {});
});

// Start Telegram Bot
telegramBot.init();

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 [Plantae Engine] Servidor operacional na porta ${PORT}`);
  console.log(`🌐 Landing Page: http://localhost:${PORT}`);
  console.log(`👑 Supreme Admin: 100% Criptografado (Acesse via token de 7 dígitos gerado pelo Telegram Bot)`);
  console.log(`🔀 Roteador WhatsApp: http://localhost:${PORT}/r/whatsapp`);

  // Notify Telegram of server operational status
  telegramBot.notifySystemLog({
    level: 'INFO',
    category: 'SERVER',
    message: `🚀 Servidor Plantae Agrocrédito iniciado e 100% operacional na porta ${PORT}`,
    details: { port: PORT, env: process.env.NODE_ENV || 'production' }
  }).catch(() => {});
});
